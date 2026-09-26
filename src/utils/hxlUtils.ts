import JSZip from 'jszip';
import { HXLNode, HXLNodeMeta, HXLSchema, HXLSchemaAttribute, HXLWidgetBundle } from '../types/hxl';

/**
 * Regex to match {!$attrs.identifier} or {!$attrs.nested.path}
 */
export const ATTR_REGEX = /\{!\$attrs\.([a-zA-Z0-9_.]+)\}/g;

/**
 * Extract all attribute keys referenced via {!$attrs.key} in a node's properties and meta
 */
export function scanForAttributes(root: HXLNode): string[] {
  const found = new Set<string>();

  function scanValue(val: any) {
    if (typeof val === 'string') {
      const matches = val.matchAll(ATTR_REGEX);
      for (const m of matches) {
        if (m[1]) found.add(m[1]);
      }
    } else if (typeof val === 'object' && val !== null) {
      const jsonStr = JSON.stringify(val);
      const matches = jsonStr.matchAll(ATTR_REGEX);
      for (const m of matches) {
        if (m[1]) found.add(m[1]);
      }
    }
  }

  function traverse(node: HXLNode) {
    if (!node) return;
    const props = node.attributes || node.properties;
    if (props) {
      for (const val of Object.values(props)) {
        scanValue(val);
      }
    }
    if (node.meta) {
      for (const val of Object.values(node.meta)) {
        scanValue(val);
      }
    }
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return Array.from(found);
}

/**
 * Generate human-friendly label from camelCase or snake_case key
 */
export function formatAttributeTitle(key: string): string {
  const clean = key.split('.').pop() || key;
  return clean
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/**
 * Maps attribute key and basic type to official Salesforce Lightning type
 * per https://developer.salesforce.com/docs/platform/hxl/guide/hxl-widget-schema.html
 */
export function mapToLightningType(key: string, attrType?: string, currentLightningType?: string): string {
  if (currentLightningType && currentLightningType.startsWith('lightning__')) {
    return currentLightningType;
  }
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('url') || lowerKey.includes('link') || lowerKey.includes('src') || lowerKey.includes('image')) {
    return 'lightning__urlType';
  }
  if (lowerKey.includes('date') || lowerKey.includes('time')) {
    return 'lightning__dateTimeType';
  }
  if (attrType === 'number') return 'lightning__numberType';
  if (attrType === 'boolean') return 'lightning__booleanType';
  if (attrType === 'object') return 'lightning__objectType';
  if (attrType === 'array') return 'lightning__objectType';
  return 'lightning__textType';
}

/**
 * Infer default mock value for a newly discovered attribute token
 */
export function inferDefaultMockValue(key: string): { type: HXLSchemaAttribute['type']; value: any; lightningType: string } {
  const lower = key.toLowerCase();
  if (lower.includes('percent') || lower.includes('progress') || lower.includes('score') || lower.includes('count') || lower.includes('qty')) {
    return { type: 'number', value: 75, lightningType: 'lightning__numberType' };
  }
  if (lower.includes('price') || lower.includes('amount') || lower.includes('cost') || lower.includes('rate') || lower.includes('total')) {
    return { type: 'string', value: '$120.00', lightningType: 'lightning__numberType' };
  }
  if (lower.includes('status') || lower.includes('stage')) {
    return { type: 'string', value: 'Active', lightningType: 'lightning__textType' };
  }
  if (lower.includes('priority')) {
    return { type: 'string', value: 'High', lightningType: 'lightning__textType' };
  }
  if (lower.includes('date') || lower.includes('time')) {
    return { type: 'string', value: 'Today, 2:30 PM', lightningType: 'lightning__dateTimeType' };
  }
  if (lower.includes('name') || lower.includes('user') || lower.includes('author') || lower.includes('customer') || lower.includes('lead')) {
    return { type: 'string', value: 'Alex Morgan', lightningType: 'lightning__textType' };
  }
  if (lower.includes('url') || lower.includes('link') || lower.includes('image') || lower.includes('src')) {
    return { type: 'string', value: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80', lightningType: 'lightning__urlType' };
  }
  if (lower.includes('items') || lower.includes('rows') || lower.includes('list') || lower.includes('amenities')) {
    return { type: 'array', value: [{ name: 'Pool' }, { name: 'Free Wi-Fi' }], lightningType: 'lightning__objectType' };
  }
  if (lower.startsWith('is') || lower.startsWith('has') || lower.includes('enabled') || lower.includes('available')) {
    return { type: 'boolean', value: true, lightningType: 'lightning__booleanType' };
  }
  return { type: 'string', value: `Sample ${formatAttributeTitle(key)}`, lightningType: 'lightning__textType' };
}

/**
 * Automatically synchronize schema.json and mockData with any tokens used in widget components
 */
export function syncSchemaWithTree(
  root: HXLNode,
  currentSchema: HXLSchema,
  currentMockData: Record<string, any>,
): { schema: HXLSchema; mockData: Record<string, any> } {
  const referencedKeys = scanForAttributes(root);
  const updatedProps = { ...(currentSchema.properties.attributes.properties || {}) };
  const updatedMock = { ...currentMockData };

  for (const key of referencedKeys) {
    if (!updatedProps[key]) {
      const inference = inferDefaultMockValue(key);
      updatedProps[key] = {
        type: inference.type,
        title: formatAttributeTitle(key),
        description: `Attribute bound to {!$attrs.${key}}`,
        default: inference.value,
        'lightning:type': inference.lightningType,
        lightningType: inference.lightningType,
      };
      if (updatedMock[key] === undefined) {
        updatedMock[key] = inference.value;
      }
    } else {
      const cur = updatedProps[key];
      if (!cur['lightning:type'] && !cur.lightningType) {
        const lType = mapToLightningType(key, cur.type);
        cur['lightning:type'] = lType;
        cur.lightningType = lType;
      }
      if (updatedMock[key] === undefined) {
        updatedMock[key] = cur.default !== undefined ? cur.default : inferDefaultMockValue(key).value;
      }
    }
  }

  const newSchema: HXLSchema = {
    title: currentSchema.title || 'Widget Schema',
    description: currentSchema.description || "Displays information for the widget's attribute contract",
    type: 'object',
    properties: {
      attributes: {
        'lightning:type': 'lightning__objectType',
        properties: updatedProps,
        required: currentSchema.properties.attributes.required || [],
      },
    },
  };

  return { schema: newSchema, mockData: updatedMock };
}

/**
 * Formats the exact schema.json structure documented at
 * https://developer.salesforce.com/docs/platform/hxl/guide/hxl-widget-schema.html
 */
export function formatSchemaForExport(bundle: HXLWidgetBundle): any {
  const currentProps = bundle.schema?.properties?.attributes?.properties || {};
  const exportedAttributesProps: Record<string, any> = {};

  for (const [key, attr] of Object.entries(currentProps)) {
    exportedAttributesProps[key] = {
      title: attr.title || formatAttributeTitle(key),
      description: attr.description || `Attribute bound to {!$attrs.${key}}`,
      'lightning:type': (attr as any)['lightning:type'] || attr.lightningType || mapToLightningType(key, attr.type),
    };
  }

  return {
    title: bundle.masterLabel || bundle.name || 'Widget Schema',
    description: bundle.description || "Displays information for the widget's attribute contract",
    type: 'object',
    properties: {
      attributes: {
        'lightning:type': 'lightning__objectType',
        properties: exportedAttributesProps,
      },
    },
  };
}

/**
 * Real-time expression evaluation
 * Replaces {!$attrs.key} with mockData values
 */
export function evaluateExpression(val: any, mockData: Record<string, any>): any {
  if (typeof val === 'number' || typeof val === 'boolean' || val === null || val === undefined) {
    return val;
  }
  if (typeof val === 'string') {
    // If the entire string is just "{!$attrs.key}" and mockData is not a string (e.g. number/boolean/array)
    const exactMatch = val.match(/^\{!\$attrs\.([a-zA-Z0-9_.]+)\}$/);
    if (exactMatch) {
      const path = exactMatch[1];
      const resolved = getNestedValue(mockData, path);
      if (resolved !== undefined) return resolved;
    }

    // Otherwise replace tokens inside the string
    return val.replace(ATTR_REGEX, (_, path) => {
      const resolved = getNestedValue(mockData, path);
      if (resolved !== undefined) {
        if (typeof resolved === 'object') return JSON.stringify(resolved);
        return String(resolved);
      }
      return `{!$attrs.${path}}`;
    });
  }
  if (Array.isArray(val)) {
    return val.map((item) => evaluateExpression(item, mockData));
  }
  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = evaluateExpression(v, mockData);
    }
    return res;
  }
  return val;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!obj) return undefined;
  if (obj[path] !== undefined) return obj[path];
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[p];
  }
  return curr;
}

/**
 * Tree traversal helpers
 */
export function findNode(root: HXLNode, id: string): HXLNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const res = findNode(child, id);
      if (res) return res;
    }
  }
  return null;
}

export function findParentNode(root: HXLNode, id: string): { parent: HXLNode; index: number } | null {
  if (!root || !root.children) return null;
  const idx = root.children.findIndex((c) => c.id === id);
  if (idx !== -1) {
    return { parent: root, index: idx };
  }
  for (const child of root.children) {
    const res = findParentNode(child, id);
    if (res) return res;
  }
  return null;
}

export function updateNodeProperties(
  root: HXLNode,
  id: string,
  newProps: Record<string, any>,
  newMeta?: HXLNodeMeta,
): HXLNode {
  function cloneAndUpdate(node: HXLNode): HXLNode {
    if (node.id === id) {
      const mergedProps = { ...(node.properties || {}), ...(node.attributes || {}), ...newProps };
      return {
        ...node,
        properties: mergedProps,
        attributes: mergedProps,
        meta: newMeta !== undefined ? newMeta : node.meta,
      };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(cloneAndUpdate),
      };
    }
    return { ...node };
  }
  return cloneAndUpdate(root);
}

export function insertNode(
  root: HXLNode,
  targetId: string,
  newNode: HXLNode,
  position: 'inside' | 'before' | 'after' = 'inside',
): HXLNode {
  // If target is root, always insert inside the root
  const isTargetRoot = targetId === root.id || targetId === 'root' || targetId === 'root_widget';
  if (isTargetRoot && (position === 'inside' || position === 'before' || position === 'after')) {
    const children = root.children ? [...root.children, newNode] : [newNode];
    return { ...root, children };
  }

  function cloneAndInsert(node: HXLNode): HXLNode {
    if (position === 'inside' && node.id === targetId) {
      const children = node.children ? [...node.children, newNode] : [newNode];
      return { ...node, children };
    }

    if (node.children) {
      const newChildren: HXLNode[] = [];
      for (const child of node.children) {
        if (child.id === targetId) {
          if (position === 'before') {
            newChildren.push(newNode);
            newChildren.push(cloneAndInsert(child));
          } else if (position === 'after') {
            newChildren.push(cloneAndInsert(child));
            newChildren.push(newNode);
          } else {
            newChildren.push(cloneAndInsert(child));
          }
        } else {
          newChildren.push(cloneAndInsert(child));
        }
      }
      return { ...node, children: newChildren };
    }

    return { ...node };
  }

  return cloneAndInsert(root);
}

export function canComponentHaveChildren(type: string): boolean {
  return [
    'tile/widget',
    'tile/card',
    'tile/container',
    'tile/column',
    'tile/row',
    'tile/list',
    'tile/listItem',
    'tile/accordion',
    'tile/accordionItem',
  ].includes(type);
}

/**
 * Reorder or move an existing node on the canvas to another location
 */
export function reorderNode(
  root: HXLNode,
  sourceId: string,
  targetId: string,
  position: 'inside' | 'before' | 'after' = 'inside',
): HXLNode {
  if (!root || sourceId === targetId || sourceId === root.id) return root;

  const sourceNode = findNode(root, sourceId);
  if (!sourceNode) return root;

  // Prevent dragging a parent into its own children/descendants
  const isTargetDescendant = findNode(sourceNode, targetId);
  if (isTargetDescendant) return root;

  // 1. Remove source from tree
  const rootWithoutSource = deleteNode(root, sourceId);

  // 2. If target is root
  const isTargetRoot = targetId === root.id || targetId === 'root' || targetId === 'root_widget';
  if (isTargetRoot) {
    return insertNode(rootWithoutSource, rootWithoutSource.id, sourceNode, 'inside');
  }

  // 3. Locate target in new tree
  const targetNode = findNode(rootWithoutSource, targetId);
  if (!targetNode) return rootWithoutSource;

  // If target cannot have children and user requested 'inside', place 'after' instead
  const effectivePosition =
    position === 'inside' && !canComponentHaveChildren(targetNode.type)
      ? 'after'
      : position;

  return insertNode(rootWithoutSource, targetId, sourceNode, effectivePosition);
}

export function deleteNode(root: HXLNode, id: string): HXLNode {
  if (root.id === id) return root; // Cannot delete root
  function cloneAndDelete(node: HXLNode): HXLNode {
    if (!node.children) return { ...node };
    return {
      ...node,
      children: node.children.filter((c) => c.id !== id).map(cloneAndDelete),
    };
  }
  return cloneAndDelete(root);
}

export function duplicateNode(root: HXLNode, id: string): HXLNode {
  const target = findNode(root, id);
  if (!target || root.id === id) return root;

  function deepCloneWithNewIds(node: HXLNode): HXLNode {
    return {
      id: 'node_' + Math.random().toString(36).substr(2, 9),
      type: node.type,
      definition: node.definition || node.type,
      properties: JSON.parse(JSON.stringify(node.properties || node.attributes || {})),
      attributes: JSON.parse(JSON.stringify(node.attributes || node.properties || {})),
      meta: node.meta ? JSON.parse(JSON.stringify(node.meta)) : undefined,
      children: node.children ? node.children.map(deepCloneWithNewIds) : undefined,
    };
  }

  const duplicated = deepCloneWithNewIds(target);
  return insertNode(root, id, duplicated, 'after');
}

export function moveNode(root: HXLNode, id: string, direction: 'up' | 'down'): HXLNode {
  const info = findParentNode(root, id);
  if (!info) return root;
  const { parent, index } = info;
  if (!parent.children) return root;

  const targetIdx = direction === 'up' ? index - 1 : index + 1;
  if (targetIdx < 0 || targetIdx >= parent.children.length) return root;

  function cloneAndSwap(node: HXLNode): HXLNode {
    if (node.id === parent.id && node.children) {
      const arr = [...node.children];
      const [removed] = arr.splice(index, 1);
      arr.splice(targetIdx, 0, removed);
      return { ...node, children: arr };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(cloneAndSwap),
      };
    }
    return { ...node };
  }

  return cloneAndSwap(root);
}

/**
 * Cleans a single component according to official Salesforce HXL guidelines:
 * - definition: component identifier string (e.g. "tile/card", "tile/text")
 * - attributes: key-value pairs
 * - meta: optional rendering instructions (if, forEach, forItem, forIndex)
 * - children: optional array of nested child components
 */
export function cleanComponentForExport(node: HXLNode): any {
  const comp: Record<string, any> = {
    definition: node.definition || node.type,
  };

  // 1. Meta rendering instructions (if, forEach, forItem, forIndex)
  if (node.meta) {
    const cleanMeta: Record<string, any> = {};
    if (node.meta.if && node.meta.if.trim()) cleanMeta.if = node.meta.if.trim();
    if (node.meta.forEach && node.meta.forEach.trim()) cleanMeta.forEach = node.meta.forEach.trim();
    if (node.meta.forItem && node.meta.forItem.trim()) cleanMeta.forItem = node.meta.forItem.trim();
    if (node.meta.forIndex && node.meta.forIndex.trim()) cleanMeta.forIndex = node.meta.forIndex.trim();
    if (Object.keys(cleanMeta).length > 0) {
      comp.meta = cleanMeta;
    }
  }

  // 2. Component configuration attributes
  const rawProps = node.attributes || node.properties;
  if (rawProps && Object.keys(rawProps).length > 0) {
    comp.attributes = rawProps;
  }

  // 3. Child components
  if (node.children && node.children.length > 0) {
    comp.children = node.children.map(cleanComponentForExport);
  }

  return comp;
}

/**
 * Produces the complete, official Salesforce HXL widget composition JSON
 * matching https://developer.salesforce.com/docs/platform/hxl/guide/hxl-widget-composition.html:
 * {
 *   "type": "lightning__agentforceWidget",
 *   "contentBody": {
 *     "widgetBody": {
 *       "definition": "tile/widget",
 *       "children": [ ... ]
 *     }
 *   }
 * }
 */
export function cleanNodeForExport(root: HXLNode): any {
  let widgetBodyObj: any;
  const isRootWidget = root.type === 'tile/widget' || root.definition === 'tile/widget';

  if (isRootWidget) {
    widgetBodyObj = cleanComponentForExport(root);
    widgetBodyObj.definition = 'tile/widget';
  } else {
    widgetBodyObj = {
      definition: 'tile/widget',
      children: [cleanComponentForExport(root)],
    };
  }

  return {
    type: 'lightning__agentforceWidget',
    contentBody: {
      widgetBody: widgetBodyObj,
    },
  };
}

/**
 * Generate Salesforce DX Metadata XML per
 * https://developer.salesforce.com/docs/platform/hxl/guide/hxl-widget-configuration.html
 */
export function generateMetaXml(bundle: HXLWidgetBundle): string {
  const masterLabel = bundle.masterLabel || bundle.name || 'Hotel Card';
  const description = bundle.description || '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<UiWidgetBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <masterLabel>${escapeXml(masterLabel)}</masterLabel>
    <description>${escapeXml(description)}</description>
    <widgetType>JSON</widgetType>
</UiWidgetBundle>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
}

/**
 * Export full UiWidgetBundle ZIP package matching Salesforce DX uiWidgets layout
 */
export async function downloadUiWidgetBundleZip(bundle: HXLWidgetBundle): Promise<void> {
  const zip = new JSZip();
  const folderName = bundle.name || 'myHxlWidget';
  const widgetFolder = zip.folder(`uiWidgets/${folderName}`);

  if (!widgetFolder) throw new Error('Failed to create ZIP directory');

  // 1. Composition file: {widgetName}.json
  const compositionJson = JSON.stringify(cleanNodeForExport(bundle.root), null, 2);
  widgetFolder.file(`${folderName}.json`, compositionJson);

  // 2. Schema file: schema.json (conforming to HXL schema documentation)
  const schemaJson = JSON.stringify(formatSchemaForExport(bundle), null, 2);
  widgetFolder.file('schema.json', schemaJson);

  // 3. Metadata XML: {widgetName}.uiwidget-meta.xml
  const metaXml = generateMetaXml(bundle);
  widgetFolder.file(`${folderName}.uiwidget-meta.xml`, metaXml);

  // 4. Default mock data helper: mockData.json (for testing in local dev)
  const mockJson = JSON.stringify(bundle.mockData, null, 2);
  widgetFolder.file('mockData.json', mockJson);

  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${folderName}-bundle.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Trigger download of any single text/json file
 */
export function downloadTextFile(filename: string, content: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface JsonLineInfo {
  lineNumber: number;
  content: string;
  nodeId?: string;
  isStartOfNode?: boolean;
  isEndOfNode?: boolean;
  nodeType?: string;
}

export interface HXLCompositionRange {
  startLine: number;
  endLine: number;
  type: string;
}

export interface HXLCompositionSerialization {
  fullJsonText: string;
  lines: JsonLineInfo[];
  nodeRanges: Record<string, HXLCompositionRange>;
}

/**
 * Serializes an HXLNode tree to official Salesforce composition JSON,
 * accurately tracking line numbers and ranges for each node ID.
 * Output conforms strictly to https://developer.salesforce.com/docs/platform/hxl/guide/hxl-widget-composition.html
 */
export function serializeHxlComposition(root: HXLNode): HXLCompositionSerialization {
  const lines: JsonLineInfo[] = [];
  const nodeRanges: Record<string, HXLCompositionRange> = {};
  let currentLine = 1;

  // Root opening brace
  lines.push({
    lineNumber: currentLine++,
    content: '{',
  });

  // Top level type: lightning__agentforceWidget
  lines.push({
    lineNumber: currentLine++,
    content: '  "type": "lightning__agentforceWidget",',
  });

  // Top level contentBody object
  lines.push({
    lineNumber: currentLine++,
    content: '  "contentBody": {',
  });

  const isRootWidget = root.type === 'tile/widget' || root.definition === 'tile/widget';
  const rootWidgetId = isRootWidget ? root.id : 'root_widget';
  const widgetStartLine = currentLine;

  lines.push({
    lineNumber: currentLine++,
    content: '    "widgetBody": {',
    nodeId: rootWidgetId,
    isStartOfNode: true,
    nodeType: 'tile/widget',
  });

  // Determine what components go inside widgetBody
  const widgetBodyNode: HXLNode = isRootWidget
    ? root
    : {
        id: 'root_widget',
        type: 'tile/widget',
        definition: 'tile/widget',
        properties: {},
        children: [root],
      };

  serializeComponentBody(widgetBodyNode, 6, rootWidgetId);

  const widgetEndLine = currentLine;
  lines.push({
    lineNumber: currentLine++,
    content: '    }',
    nodeId: rootWidgetId,
    isEndOfNode: true,
    nodeType: 'tile/widget',
  });

  nodeRanges[rootWidgetId] = {
    startLine: widgetStartLine,
    endLine: widgetEndLine,
    type: 'tile/widget',
  };

  // Close contentBody
  lines.push({
    lineNumber: currentLine++,
    content: '  }',
  });

  // Close root
  lines.push({
    lineNumber: currentLine++,
    content: '}',
  });

  function serializeComponentBody(node: HXLNode, depth: number, parentNodeId: string) {
    const innerIndent = ' '.repeat(depth);
    const compDef = node.definition || node.type || 'tile/widget';

    // 1. Definition
    const cleanMeta: Record<string, any> = {};
    if (node.meta) {
      if (node.meta.if && node.meta.if.trim()) cleanMeta.if = node.meta.if.trim();
      if (node.meta.forEach && node.meta.forEach.trim()) cleanMeta.forEach = node.meta.forEach.trim();
      if (node.meta.forItem && node.meta.forItem.trim()) cleanMeta.forItem = node.meta.forItem.trim();
      if (node.meta.forIndex && node.meta.forIndex.trim()) cleanMeta.forIndex = node.meta.forIndex.trim();
    }
    const hasMeta = Object.keys(cleanMeta).length > 0;

    const rawProps = node.attributes || node.properties;
    const hasAttributes = Boolean(rawProps && Object.keys(rawProps).length > 0);
    const hasChildren = Boolean(node.children && node.children.length > 0);

    const hasMoreAfterDef = hasMeta || hasAttributes || hasChildren;

    lines.push({
      lineNumber: currentLine++,
      content: `${innerIndent}"definition": ${JSON.stringify(compDef)}${hasMoreAfterDef ? ',' : ''}`,
      nodeId: parentNodeId,
      nodeType: compDef,
    });

    // 2. Meta (rendering logic)
    if (hasMeta) {
      const hasMoreAfterMeta = hasAttributes || hasChildren;
      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}"meta": {`,
        nodeId: parentNodeId,
        nodeType: compDef,
      });

      const metaEntries = Object.entries(cleanMeta);
      metaEntries.forEach(([mKey, mVal], mIdx) => {
        const isLastMeta = mIdx === metaEntries.length - 1;
        lines.push({
          lineNumber: currentLine++,
          content: `${innerIndent}  "${mKey}": ${JSON.stringify(mVal)}${isLastMeta ? '' : ','}`,
          nodeId: parentNodeId,
          nodeType: compDef,
        });
      });

      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}}${hasMoreAfterMeta ? ',' : ''}`,
        nodeId: parentNodeId,
        nodeType: compDef,
      });
    }

    // 3. Attributes
    if (hasAttributes && rawProps) {
      const hasMoreAfterAttrs = hasChildren;
      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}"attributes": {`,
        nodeId: parentNodeId,
        nodeType: compDef,
      });

      const attrEntries = Object.entries(rawProps);
      attrEntries.forEach(([aKey, aVal], aIdx) => {
        const isLastAttr = aIdx === attrEntries.length - 1;
        const valJson = JSON.stringify(aVal, null, 2);
        const valLines = valJson.split('\n');

        if (valLines.length === 1) {
          lines.push({
            lineNumber: currentLine++,
            content: `${innerIndent}  "${aKey}": ${valJson}${isLastAttr ? '' : ','}`,
            nodeId: parentNodeId,
            nodeType: compDef,
          });
        } else {
          lines.push({
            lineNumber: currentLine++,
            content: `${innerIndent}  "${aKey}": ${valLines[0]}`,
            nodeId: parentNodeId,
            nodeType: compDef,
          });
          for (let i = 1; i < valLines.length; i++) {
            const isEndVal = i === valLines.length - 1;
            lines.push({
              lineNumber: currentLine++,
              content: `${innerIndent}  ${valLines[i]}${isEndVal && !isLastAttr ? ',' : ''}`,
              nodeId: parentNodeId,
              nodeType: compDef,
            });
          }
        }
      });

      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}}${hasMoreAfterAttrs ? ',' : ''}`,
        nodeId: parentNodeId,
        nodeType: compDef,
      });
    }

    // 4. Children
    if (hasChildren && node.children) {
      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}"children": [`,
        nodeId: parentNodeId,
        nodeType: compDef,
      });

      for (let i = 0; i < node.children.length; i++) {
        const isLastChild = i === node.children.length - 1;
        serializeChildComponent(node.children[i], depth + 2, isLastChild);
      }

      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}]`,
        nodeId: parentNodeId,
        nodeType: compDef,
      });
    }
  }

  function serializeChildComponent(node: HXLNode, depth: number, isLast: boolean) {
    const startLine = currentLine;
    const indent = ' '.repeat(depth);
    const compDef = node.definition || node.type;

    lines.push({
      lineNumber: currentLine++,
      content: `${indent}{`,
      nodeId: node.id,
      isStartOfNode: true,
      nodeType: compDef,
    });

    serializeComponentBody(node, depth + 2, node.id);

    const endLine = currentLine;
    lines.push({
      lineNumber: currentLine++,
      content: `${indent}}${isLast ? '' : ','}`,
      nodeId: node.id,
      isEndOfNode: true,
      nodeType: compDef,
    });

    nodeRanges[node.id] = {
      startLine,
      endLine,
      type: compDef,
    };
  }

  const fullJsonText = lines.map((l) => l.content).join('\n');

  return {
    fullJsonText,
    lines,
    nodeRanges,
  };
}


