import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  BookOpen,
  FolderTree,
  LayoutGrid,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import {
  HXLComponentDoc,
  HXLComponentType,
  HXLNode,
  HXLSchema,
  HXLSchemaAttribute,
  HXLWidgetBundle,
  SurfaceType,
  ViewMode,
} from './types/hxl';
import { HXL_COMPONENTS } from './data/hxlComponentCatalog';
import { SAMPLE_TEMPLATES } from './data/sampleTemplates';
import {
  cleanNodeForExport,
  deleteNode,
  downloadUiWidgetBundleZip,
  duplicateNode,
  findNode,
  insertNode,
  moveNode,
  reorderNode,
  syncSchemaWithTree,
  updateNodeProperties,
} from './utils/hxlUtils';
import { Navbar } from './components/Navbar';
import { ComponentPalette } from './components/ComponentPalette';
import { HierarchyTree } from './components/HierarchyTree';
import { CanvasRenderer } from './components/CanvasRenderer';
import { InspectorPanel } from './components/InspectorPanel';
import { JsonViewPanel } from './components/JsonViewPanel';
import { ComponentDocModal } from './components/ComponentDocModal';

const STORAGE_KEY = 'salesforce_hxl_widget_composer_bundle_v1';

export default function App() {
  // Load initial bundle from localStorage or first sample template
  const [bundle, setBundle] = useState<HXLWidgetBundle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.root && parsed.schema) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved bundle from localStorage', e);
    }
    return SAMPLE_TEMPLATES[0];
  });

  // Undo / Redo history
  const [history, setHistory] = useState<HXLWidgetBundle[]>([bundle]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root_widget');
  const [surface, setSurface] = useState<SurfaceType>('lightning');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [leftSidebarTab, setLeftSidebarTab] = useState<'palette' | 'tree'>('palette');

  // Documentation modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalComponent, setDocModalComponent] = useState<string | null>(null);

  // Sync bundle with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
    } catch (e) {
      console.warn('Unable to persist bundle to localStorage', e);
    }
  }, [bundle]);

  // Record a new state in history
  const commitBundleChange = useCallback((newBundle: HXLWidgetBundle) => {
    setBundle(newBundle);
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newBundle];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setBundle(prev);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setBundle(next);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (!isInput && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedNodeId && selectedNodeId !== bundle.root.id) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
        }
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedNodeId, bundle.root.id]);

  // Selected node object
  const selectedNode = selectedNodeId ? findNode(bundle.root, selectedNodeId) : null;

  // Insert a new component
  const handleInsertNode = (
    componentType: HXLComponentType | string,
    targetId?: string,
    position: 'inside' | 'before' | 'after' = 'inside',
  ) => {
    const doc = HXL_COMPONENTS.find((c) => c.type === componentType);
    const initialProps: Record<string, any> = {};
    if (doc?.officialProps) {
      for (const p of doc.officialProps) {
        if (p.default !== undefined) {
          initialProps[p.name] = p.default;
        }
      }
    }

    const newNode: HXLNode = {
      id: 'node_' + Math.random().toString(36).substr(2, 9),
      type: componentType as HXLComponentType,
      properties: initialProps,
      children: doc?.canHaveChildren ? [] : undefined,
    };

    const effectiveTargetId = targetId || selectedNodeId || bundle.root.id;
    const targetNode = findNode(bundle.root, effectiveTargetId);

    // If target cannot have children and user wants to insert inside, insert after target instead
    const targetDoc = targetNode ? HXL_COMPONENTS.find((c) => c.type === targetNode.type) : null;
    const effectivePosition =
      position === 'inside' && !targetDoc?.canHaveChildren && targetNode?.id !== bundle.root.id
        ? 'after'
        : position;

    const newRoot = insertNode(bundle.root, effectiveTargetId, newNode, effectivePosition);

    // Synchronize schema and default mock values automatically
    const { schema: syncedSchema, mockData: syncedMock } = syncSchemaWithTree(
      newRoot,
      bundle.schema,
      bundle.mockData,
    );

    const updatedBundle: HXLWidgetBundle = {
      ...bundle,
      root: newRoot,
      schema: syncedSchema,
      mockData: syncedMock,
    };

    commitBundleChange(updatedBundle);
    setSelectedNodeId(newNode.id);
  };

  // Update properties on selected node
  const handleUpdateProperty = (propName: string, value: any) => {
    if (!selectedNodeId) return;
    const newRoot = updateNodeProperties(bundle.root, selectedNodeId, { [propName]: value });

    // Synchronize schema and mock values
    const { schema: syncedSchema, mockData: syncedMock } = syncSchemaWithTree(
      newRoot,
      bundle.schema,
      bundle.mockData,
    );

    const updatedBundle: HXLWidgetBundle = {
      ...bundle,
      root: newRoot,
      schema: syncedSchema,
      mockData: syncedMock,
    };

    commitBundleChange(updatedBundle);
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    if (id === bundle.root.id) return;
    const newRoot = deleteNode(bundle.root, id);
    const updatedBundle: HXLWidgetBundle = {
      ...bundle,
      root: newRoot,
    };
    commitBundleChange(updatedBundle);
    setSelectedNodeId(null);
  };

  // Duplicate node
  const handleDuplicateNode = (id: string) => {
    if (id === bundle.root.id) return;
    const newRoot = duplicateNode(bundle.root, id);
    const updatedBundle: HXLWidgetBundle = {
      ...bundle,
      root: newRoot,
    };
    commitBundleChange(updatedBundle);
  };

  // Move node up or down
  const handleMoveNode = (id: string, direction: 'up' | 'down') => {
    const newRoot = moveNode(bundle.root, id, direction);
    const updatedBundle: HXLWidgetBundle = {
      ...bundle,
      root: newRoot,
    };
    commitBundleChange(updatedBundle);
  };

  // Drag-and-drop reorder node
  const handleReorderNode = (
    sourceId: string,
    targetId: string,
    position: 'inside' | 'before' | 'after',
  ) => {
    const newRoot = reorderNode(bundle.root, sourceId, targetId, position);
    const updatedBundle: HXLWidgetBundle = {
      ...bundle,
      root: newRoot,
    };
    commitBundleChange(updatedBundle);
    setSelectedNodeId(sourceId);
  };

  // Update mock data for live visual preview
  const handleUpdateMockData = (key: string, value: any) => {
    const updatedMock = {
      ...bundle.mockData,
      [key]: value,
    };
    setBundle((prev) => ({
      ...prev,
      mockData: updatedMock,
    }));
  };

  // Add schema attribute
  const handleAddSchemaAttribute = (
    key: string,
    attr: HXLSchemaAttribute,
    mockValue: any,
    isRequired?: boolean,
  ) => {
    let requiredList = [...(bundle.schema.properties.attributes.required || [])];
    if (isRequired && !requiredList.includes(key)) {
      requiredList.push(key);
    }

    const updatedSchema: HXLSchema = {
      ...bundle.schema,
      properties: {
        attributes: {
          ...bundle.schema.properties.attributes,
          required: requiredList,
          properties: {
            ...bundle.schema.properties.attributes.properties,
            [key]: attr,
          },
        },
      },
    };
    const updatedMock = {
      ...bundle.mockData,
      [key]: mockValue,
    };
    commitBundleChange({
      ...bundle,
      schema: updatedSchema,
      mockData: updatedMock,
    });
  };

  // Update schema attribute (description, title, type, required status)
  const handleUpdateSchemaAttribute = (
    key: string,
    updatedFields: Partial<HXLSchemaAttribute>,
    isRequired?: boolean,
  ) => {
    const currentAttr = bundle.schema.properties.attributes.properties[key] || {
      type: 'string',
      title: key,
      description: `Attribute bound to {!$attrs.${key}}`,
    };

    const newAttr: HXLSchemaAttribute = {
      ...currentAttr,
      ...updatedFields,
    };

    let requiredList = [...(bundle.schema.properties.attributes.required || [])];
    if (isRequired !== undefined) {
      if (isRequired && !requiredList.includes(key)) {
        requiredList.push(key);
      } else if (!isRequired && requiredList.includes(key)) {
        requiredList = requiredList.filter((k) => k !== key);
      }
    }

    const updatedSchema: HXLSchema = {
      ...bundle.schema,
      properties: {
        attributes: {
          ...bundle.schema.properties.attributes,
          required: requiredList,
          properties: {
            ...bundle.schema.properties.attributes.properties,
            [key]: newAttr,
          },
        },
      },
    };

    // If default value or type was updated and mockData exists
    let updatedMock = { ...bundle.mockData };
    if (updatedFields.default !== undefined && updatedMock[key] === undefined) {
      updatedMock[key] = updatedFields.default;
    }

    commitBundleChange({
      ...bundle,
      schema: updatedSchema,
      mockData: updatedMock,
    });
  };

  // Delete schema attribute
  const handleDeleteSchemaAttribute = (key: string) => {
    const newProps = { ...bundle.schema.properties.attributes.properties };
    delete newProps[key];
    const newMock = { ...bundle.mockData };
    delete newMock[key];

    const updatedSchema = {
      ...bundle.schema,
      properties: {
        attributes: {
          ...bundle.schema.properties.attributes,
          properties: newProps,
        },
      },
    };
    commitBundleChange({
      ...bundle,
      schema: updatedSchema,
      mockData: newMock,
    });
  };

  // Select sample template
  const handleSelectTemplate = (templateIndex: number) => {
    const selected = SAMPLE_TEMPLATES[templateIndex];
    if (selected) {
      commitBundleChange(JSON.parse(JSON.stringify(selected)));
      setSelectedNodeId(selected.root.id);
    }
  };

  // New blank card widget
  const handleNewBlankWidget = () => {
    const blank: HXLWidgetBundle = {
      name: 'newHxlWidget',
      masterLabel: 'New HXL Widget Card',
      description: 'Custom composed HXL widget for Salesforce Lightning & Agentforce.',
      widgetType: 'JSON',
      root: {
        id: 'root_card',
        type: 'tile/container',
        properties: { variant: 'card', padding: 'medium', rounded: 'medium' },
        children: [
          {
            id: 'text_title',
            type: 'tile/text',
            properties: { text: '{!$attrs.title}', variant: 'h3', weight: 'bold' },
          },
          {
            id: 'text_desc',
            type: 'tile/text',
            properties: { text: '{!$attrs.description}', variant: 'body', color: 'muted' },
          },
        ],
      },
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          attributes: {
            type: 'object',
            properties: {
              title: { type: 'string', title: 'Card Title', default: 'My Custom Title' },
              description: {
                type: 'string',
                title: 'Card Description',
                default: 'Drag components from the library to build your layout.',
              },
            },
            required: ['title'],
          },
        },
      },
      mockData: {
        title: 'My Custom Title',
        description: 'Drag components from the library to build your layout.',
      },
    };

    commitBundleChange(blank);
    setSelectedNodeId('root_card');
  };

  // Export full DX bundle
  const handleExportZip = async () => {
    await downloadUiWidgetBundleZip(bundle);
  };

  // Copy composition JSON
  const handleCopyCompositionJson = () => {
    const clean = cleanNodeForExport(bundle.root);
    navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
  };

  const handleOpenDocModal = (componentType?: string) => {
    setDocModalComponent(componentType || null);
    setDocModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar
        widgetName={bundle.name}
        onChangeWidgetName={(newName) =>
          setBundle((prev) => ({ ...prev, name: newName }))
        }
        surface={surface}
        onChangeSurface={setSurface}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSelectTemplate={handleSelectTemplate}
        onNewBlankWidget={handleNewBlankWidget}
        onOpenDocModal={() => handleOpenDocModal()}
        onExportZip={handleExportZip}
        onCopyCompositionJson={handleCopyCompositionJson}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Palette & Outline Tree */}
        <div className="flex flex-col border-r border-slate-200 bg-white shrink-0">
          {/* Sidebar Mode Tabs */}
          <div className="flex border-b border-slate-200 text-xs bg-slate-50">
            <button
              type="button"
              onClick={() => setLeftSidebarTab('palette')}
              className={`flex-1 py-2 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                leftSidebarTab === 'palette'
                  ? 'border-[#0070d2] text-[#0070d2] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Palette</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftSidebarTab('tree')}
              className={`flex-1 py-2 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                leftSidebarTab === 'tree'
                  ? 'border-[#0070d2] text-[#0070d2] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Tree Outline</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden w-80">
            {leftSidebarTab === 'palette' ? (
              <ComponentPalette
                onSelectComponentToAdd={(type) => handleInsertNode(type)}
                onOpenDocModal={(type) => handleOpenDocModal(type)}
              />
            ) : (
              <HierarchyTree
                rootNode={bundle.root}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => setSelectedNodeId(id)}
                onMoveNode={handleMoveNode}
                onDuplicateNode={handleDuplicateNode}
                onDeleteNode={handleDeleteNode}
                onInsertNode={(type, targetId) => handleInsertNode(type, targetId, 'inside')}
                onReorderNode={handleReorderNode}
              />
            )}
          </div>
        </div>

        {/* Center Workspace: Canvas / Split / JSON */}
        <div className="flex-1 flex overflow-hidden">
          {viewMode === 'canvas' && (
            <CanvasRenderer
              rootNode={bundle.root}
              mockData={bundle.mockData}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              surface={surface}
              onInsertNode={(type, targetId, pos) => handleInsertNode(type, targetId, pos)}
              onReorderNode={handleReorderNode}
              onMoveNode={handleMoveNode}
              onDuplicateNode={handleDuplicateNode}
              onDeleteNode={handleDeleteNode}
              onOpenDocModal={handleOpenDocModal}
            />
          )}

          {viewMode === 'split' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col overflow-hidden">
                <CanvasRenderer
                  rootNode={bundle.root}
                  mockData={bundle.mockData}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                  surface={surface}
                  onInsertNode={(type, targetId, pos) => handleInsertNode(type, targetId, pos)}
                  onReorderNode={handleReorderNode}
                  onMoveNode={handleMoveNode}
                  onDuplicateNode={handleDuplicateNode}
                  onDeleteNode={handleDeleteNode}
                  onOpenDocModal={handleOpenDocModal}
                />
              </div>

              <div className="w-[420px] xl:w-[480px] border-l border-slate-700 flex flex-col">
                <JsonViewPanel
                  bundle={bundle}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                />
              </div>
            </div>
          )}

          {viewMode === 'json' && (
            <div className="flex-1 flex">
              <JsonViewPanel
                bundle={bundle}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: Inspector Panel (Properties, Docs, Schema & Mock Data) */}
        <InspectorPanel
          selectedNode={selectedNode}
          rootNode={bundle.root}
          schema={bundle.schema}
          mockData={bundle.mockData}
          onUpdateProperty={handleUpdateProperty}
          onUpdateMockData={handleUpdateMockData}
          onAddSchemaAttribute={handleAddSchemaAttribute}
          onUpdateSchemaAttribute={handleUpdateSchemaAttribute}
          onDeleteSchemaAttribute={handleDeleteSchemaAttribute}
          onOpenDocModal={handleOpenDocModal}
          onMoveNode={handleMoveNode}
        />
      </div>

      {/* Component Specification Documentation Modal */}
      <ComponentDocModal
        isOpen={docModalOpen}
        initialComponentType={docModalComponent}
        onClose={() => setDocModalOpen(false)}
        onSelectComponentToAdd={(type) => handleInsertNode(type)}
      />
    </div>
  );
}
