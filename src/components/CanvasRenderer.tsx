import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Copy,
  Layers,
  MessageSquare,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { HXLNode, SurfaceType } from '../types/hxl';
import { findNode, findParentNode } from '../utils/hxlUtils';
import { HXL_COMPONENTS } from '../data/hxlComponentCatalog';
import { DropPayload, HXLNodeRenderer } from './HXLNodeRenderer';
import {
  getGlobalDragState,
  setGlobalDragState,
  useGlobalDrag,
  parseHxlDragPayload,
  clearDragStateImmediately,
} from '../utils/dragManager';
import { HoverProvider, useHoveredNode } from '../context/HoverContext';

interface CanvasRendererProps {
  rootNode: HXLNode;
  mockData: Record<string, any>;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  surface: SurfaceType;
  onInsertNode: (newNodeType: string, targetId: string, position: 'inside' | 'before' | 'after') => void;
  onReorderNode: (sourceId: string, targetId: string, position: 'inside' | 'before' | 'after') => void;
  onMoveNode: (id: string, direction: 'up' | 'down') => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onOpenDocModal: (componentType: string) => void;
}

const CanvasRendererContent: React.FC<CanvasRendererProps> = ({
  rootNode,
  mockData,
  selectedNodeId,
  onSelectNode,
  surface,
  onInsertNode,
  onReorderNode,
  onMoveNode,
  onDuplicateNode,
  onDeleteNode,
  onOpenDocModal,
}) => {
  const { setHoveredNodeId } = useHoveredNode();
  const selectedNode = selectedNodeId ? findNode(rootNode, selectedNodeId) : null;
  const parentInfo = selectedNodeId ? findParentNode(rootNode, selectedNodeId) : null;
  const selectedDoc = selectedNode
    ? HXL_COMPONENTS.find((c) => c.type === selectedNode.type)
    : null;

  // Handle drag over root canvas
  const [isDragOverRoot, setIsDragOverRoot] = React.useState(false);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking outside any node
    const targetId = (e.target as HTMLElement).id;
    if (targetId === 'canvas-background-stage' || targetId === 'canvas-stage-inner') {
      onSelectNode(null);
    }
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverRoot(true);
  };

  const handleRootDragLeave = () => {
    setIsDragOverRoot(false);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverRoot(false);

    const payload = parseHxlDragPayload(e);
    clearDragStateImmediately();

    if (!payload) return;

    if (payload.sourceType === 'canvas' && payload.nodeId) {
      if (payload.nodeId !== rootNode.id) {
        onReorderNode(payload.nodeId, rootNode.id, 'inside');
      }
    } else if (payload.sourceType === 'palette' && payload.componentType) {
      onInsertNode(payload.componentType, rootNode.id, 'inside');
    }
  };

  const handleDropPayload = (payload: DropPayload) => {
    if (payload.sourceType === 'palette' && payload.componentType) {
      onInsertNode(payload.componentType, payload.targetNodeId, payload.position);
    } else if (payload.sourceType === 'canvas' && payload.sourceNodeId) {
      if (payload.sourceNodeId !== payload.targetNodeId) {
        onReorderNode(payload.sourceNodeId, payload.targetNodeId, payload.position);
      }
    }
  };

  return (
    <div
      id="canvas-background-stage"
      onClick={handleCanvasClick}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
      onMouseOver={(e) => {
        if (e.target === e.currentTarget) {
          setHoveredNodeId(null);
        }
      }}
      onMouseLeave={() => {
        setHoveredNodeId(null);
      }}
      className="flex-1 bg-slate-100/70 overflow-auto relative select-none"
    >
      <div
        id="canvas-stage-inner"
        className="min-w-fit w-full min-h-full p-6 md:p-8 flex flex-col items-center justify-start"
      >
      {/* Floating Action Toolbar for Selected Node */}
      {selectedNode && (
        <div
          id="floating-node-toolbar"
          className="sticky top-2 z-30 mb-4 bg-slate-900 text-white rounded-lg shadow-xl px-3 py-1.5 flex items-center gap-2 text-xs border border-slate-700 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700 font-mono text-2xs text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>{selectedNode.type}</span>
          </div>

          {/* Reorder actions */}
          {parentInfo && (
            <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              <span className="text-3xs text-slate-400 font-medium">Reorder:</span>
              <button
                type="button"
                title="Move up / before sibling"
                disabled={parentInfo.index === 0}
                onClick={() => onMoveNode(selectedNode.id, 'up')}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200 hover:text-white flex items-center gap-0.5 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span className="text-3xs font-semibold">Up</span>
              </button>
              <button
                type="button"
                title="Move down / after sibling"
                disabled={
                  !parentInfo.parent.children ||
                  parentInfo.index === parentInfo.parent.children.length - 1
                }
                onClick={() => onMoveNode(selectedNode.id, 'down')}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200 hover:text-white flex items-center gap-0.5 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span className="text-3xs font-semibold">Down</span>
              </button>
            </div>
          )}

          <button
            type="button"
            title="Duplicate component"
            onClick={() => onDuplicateNode(selectedNode.id)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {selectedDoc?.canHaveChildren && (
            <button
              type="button"
              title="Add child text"
              onClick={() => onInsertNode('tile/text', selectedNode.id, 'inside')}
              className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-2xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Child</span>
            </button>
          )}

          <button
            type="button"
            title="View component documentation"
            onClick={() => onOpenDocModal(selectedNode.type)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          {selectedNode.id !== rootNode.id && (
            <button
              type="button"
              title="Delete component"
              onClick={() => onDeleteNode(selectedNode.id)}
              className="p-1 rounded hover:bg-rose-950 text-rose-400 hover:text-rose-300"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Surface Frame Simulation Container */}
      <div
        id="widget-surface-container"
        className={`w-full min-w-[360px] transition-all duration-200 ${
          surface === 'slack'
            ? 'max-w-xl bg-white rounded-lg shadow-md border border-slate-300 p-4'
            : surface === 'chat'
            ? 'max-w-xl bg-white rounded-2xl shadow-md border border-slate-200 p-5'
            : surface === 'lightning'
            ? 'max-w-2xl bg-[#f3f3f3] rounded-lg shadow-md border border-slate-300 overflow-hidden'
            : 'max-w-3xl bg-white rounded-lg shadow-sm border border-slate-200 p-6'
        }`}
      >
        {/* Surface Header Decorators */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#0070d2] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ⚡
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Style: {surface}
            </span>
          </div>
        </div>
      
        {/* The Live Composed Widget Node Hierarchy */}
        <div className={surface === 'lightning' ? 'p-4' : ''}>
          <HXLNodeRenderer
            node={rootNode}
            isRoot={true}
            mockData={mockData}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => onSelectNode(id)}
            surface={surface}
            onDropPayload={handleDropPayload}
          />
        </div>

        {/* Drop zone indicator when dragging over root */}
        {isDragOverRoot && (
          <div className="mt-4 border-2 border-dashed border-blue-500 bg-blue-50/50 rounded-lg p-6 text-center text-xs text-blue-700 font-medium">
            Drop component here to append to widget root
          </div>
        )}
      </div>

      {/* Surface Helper Footer */}
      <div className="mt-4 text-center text-2xs text-slate-400 flex items-center gap-2">
        <span>Previewing active surface: <strong>{surface.toUpperCase()}</strong></span>
        <span>•</span>
        <span>Click any element to inspect & modify properties</span>
      </div>
      </div>
    </div>
  );
};

export const CanvasRenderer: React.FC<CanvasRendererProps> = (props) => {
  return (
    <HoverProvider>
      <CanvasRendererContent {...props} />
    </HoverProvider>
  );
};
