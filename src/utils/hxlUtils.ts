import JSZip from 'jszip';
import { HXLNode, HXLSchema, HXLSchemaAttribute, HXLWidgetBundle } from '../types/hxl';

/**
 * Regex to match {!$attrs.identifier} or {!$attrs.nested.path}
 */
export const ATTR_REGEX = /\{!\$attrs\.([a-zA-Z0-9_.]+)\}/g;

/**
 * Extract all attribute keys referenced via {!$attrs.key} in a node's properties
 */
export function scanForAttributes(root: HXLNode): string[] {
  const found = new Set<string>();

  function traverse(node: HXLNode) {
    if (!node) return;
    if (node.properties) {
      for (const val of Object.values(node.properties)) {
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
 * Infer default mock value for a newly discovered attribute token
 */
export function inferDefaultMockValue(key: string): { type: HXLSchemaAttribute['type']; value: any } {
  const lower = key.toLowerCase();
  if (lower.includes('percent') || lower.includes('progress') || lower.includes('score') || lower.includes('count') || lower.includes('qty')) {
    return { type: 'number', value: 75 };
  }
  if (lower.includes('price') || lower.includes('amount') || lower.includes('cost') || lower.includes('total')) {
    return { type: 'string', value: '$120.00' };
  }
  if (lower.includes('status') || lower.includes('stage')) {
    return { type: 'string', value: 'Active' };
  }
  if (lower.includes('priority')) {
    return { type: 'string', value: 'High' };
  }
  if (lower.includes('date') || lower.includes('time')) {
    return { type: 'string', value: 'Today, 2:30 PM' };
  }
  if (lower.includes('name') || lower.includes('user') || lower.includes('author') || lower.includes('customer')) {
    return { type: 'string', value: 'Alex Morgan' };
  }
  if (lower.includes('url') || lower.includes('link')) {
    return { type: 'string', value: 'https://salesforce.com' };
  }
  if (lower.includes('items') || lower.includes('rows') || lower.includes('list')) {
    return { type: 'array', value: [{ title: 'Item 1' }, { title: 'Item 2' }] };
  }
  if (lower.startsWith('is') || lower.startsWith('has') || lower.includes('enabled')) {
    return { type: 'boolean', value: true };
  }
  return { type: 'string', value: `Sample ${formatAttributeTitle(key)}` };
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
      };
      if (updatedMock[key] === undefined) {
        updatedMock[key] = inference.value;
      }
    } else if (updatedMock[key] === undefined) {
      updatedMock[key] = updatedProps[key].default !== undefined ? updatedProps[key].default : inferDefaultMockValue(key).value;
    }
  }

  const newSchema: HXLSchema = {
    $schema: currentSchema.$schema || 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      attributes: {
        type: 'object',
        properties: updatedProps,
        required: currentSchema.properties.attributes.required || [],
      },
    },
  };

  return { schema: newSchema, mockData: updatedMock };
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

export function updateNodeProperties(root: HXLNode, id: string, newProps: Record<string, any>): HXLNode {
  function cloneAndUpdate(node: HXLNode): HXLNode {
    if (node.id === id) {
      return {
        ...node,
        properties: { ...node.properties, ...newProps },
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
            // position === 'inside' for this child
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
      properties: JSON.parse(JSON.stringify(node.properties || {})),
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
 * Remove internal 'id' fields to produce clean Salesforce HXL composition JSON
 */
export function cleanNodeForExport(node: HXLNode): any {
  const res: Record<string, any> = {
    type: node.type,
  };
  if (node.properties && Object.keys(node.properties).length > 0) {
    res.properties = node.properties;
  }
  if (node.children && node.children.length > 0) {
    res.children = node.children.map(cleanNodeForExport);
  }
  return res;
}

/**
 * Generate Salesforce DX Metadata XML
 */
export function generateMetaXml(bundle: HXLWidgetBundle): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<UiWidgetBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <masterLabel>${escapeXml(bundle.masterLabel || bundle.name)}</masterLabel>
    <description>${escapeXml(bundle.description || '')}</description>
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
 * Export full UiWidgetBundle ZIP package
 */
export async function downloadUiWidgetBundleZip(bundle: HXLWidgetBundle): Promise<void> {
  const zip = new JSZip();
  const folderName = bundle.name || 'myHxlWidget';
  const widgetFolder = zip.folder(`uiWidgets/${folderName}`);

  if (!widgetFolder) throw new Error('Failed to create ZIP directory');

  // 1. Composition file: {widgetName}.json
  const compositionJson = JSON.stringify(cleanNodeForExport(bundle.root), null, 2);
  widgetFolder.file(`${folderName}.json`, compositionJson);

  // 2. Schema file: schema.json
  const schemaJson = JSON.stringify(bundle.schema, null, 2);
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
 * Serializes an HXLNode tree to Salesforce composition JSON,
 * precisely tracking line numbers and ranges for each node ID.
 */
export function serializeHxlComposition(root: HXLNode): HXLCompositionSerialization {
  const lines: JsonLineInfo[] = [];
  const nodeRanges: Record<string, HXLCompositionRange> = {};
  let currentLine = 1;

  function serializeNode(node: HXLNode, depth: number, isLast: boolean) {
    const startLine = currentLine;
    const indent = ' '.repeat(depth);
    const innerIndent = ' '.repeat(depth + 2);

    // Opening brace for this node
    lines.push({
      lineNumber: currentLine++,
      content: `${indent}{`,
      nodeId: node.id,
      isStartOfNode: true,
      nodeType: node.type,
    });

    const entries: string[] = ['type'];
    if (node.properties && Object.keys(node.properties).length > 0) {
      entries.push('properties');
    }
    if (node.children && node.children.length > 0) {
      entries.push('children');
    }

    // 1. type
    const hasMoreAfterType = entries.length > 1;
    lines.push({
      lineNumber: currentLine++,
      content: `${innerIndent}"type": ${JSON.stringify(node.type)}${hasMoreAfterType ? ',' : ''}`,
      nodeId: node.id,
      nodeType: node.type,
    });

    // 2. properties
    if (node.properties && Object.keys(node.properties).length > 0) {
      const hasMoreAfterProps = entries.indexOf('properties') < entries.length - 1;
      const propJson = JSON.stringify(node.properties, null, 2);
      const rawPropLines = propJson.split('\n');

      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}"properties": {`,
        nodeId: node.id,
        nodeType: node.type,
      });

      for (let i = 1; i < rawPropLines.length - 1; i++) {
        lines.push({
          lineNumber: currentLine++,
          content: `${innerIndent}${rawPropLines[i]}`,
          nodeId: node.id,
          nodeType: node.type,
        });
      }

      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}}${hasMoreAfterProps ? ',' : ''}`,
        nodeId: node.id,
        nodeType: node.type,
      });
    }

    // 3. children
    if (node.children && node.children.length > 0) {
      const hasMoreAfterChildren = entries.indexOf('children') < entries.length - 1;
      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}"children": [`,
        nodeId: node.id,
        nodeType: node.type,
      });

      for (let i = 0; i < node.children.length; i++) {
        const isLastChild = i === node.children.length - 1;
        serializeNode(node.children[i], depth + 4, isLastChild);
      }

      lines.push({
        lineNumber: currentLine++,
        content: `${innerIndent}]${hasMoreAfterChildren ? ',' : ''}`,
        nodeId: node.id,
        nodeType: node.type,
      });
    }

    // Closing brace for this node
    const endLine = currentLine;
    lines.push({
      lineNumber: currentLine++,
      content: `${indent}}${isLast ? '' : ','}`,
      nodeId: node.id,
      isEndOfNode: true,
      nodeType: node.type,
    });

    nodeRanges[node.id] = {
      startLine,
      endLine,
      type: node.type,
    };
  }

  serializeNode(root, 0, true);

  const fullJsonText = lines.map((l) => l.content).join('\n');

  return {
    fullJsonText,
    lines,
    nodeRanges,
  };
}

