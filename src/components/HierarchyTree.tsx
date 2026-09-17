import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  GripVertical,
  Layers,
  MoveDown,
  MoveUp,
  Plus,
  Trash2,
} from 'lucide-react';
import { HXLNode } from '../types/hxl';
import { HXL_COMPONENTS } from '../data/hxlComponentCatalog';
import {
  clearDragStateImmediately,
  getGlobalDragState,
  parseHxlDragPayload,
  serializeHxlDrag,
  setGlobalDragState,
} from '../utils/dragManager';

interface HierarchyTreeProps {
  rootNode: HXLNode;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onMoveNode: (id: string, direction: 'up' | 'down') => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onInsertNode: (newNodeType: string, targetId: string) => void;
  onReorderNode: (sourceId: string, targetId: string, position: 'inside' | 'before' | 'after') => void;
}

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  rootNode,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onDuplicateNode,
  onDeleteNode,
  onInsertNode,
  onReorderNode,
}) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: 'before' | 'after' | 'inside';
  } | null>(null);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTreeDragStart = (e: React.DragEvent, node: HXLNode) => {
    if (node.id === rootNode.id) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDraggingNodeId(node.id);

    const payload = {
      sourceType: 'canvas' as const,
      nodeId: node.id,
      componentType: node.type,
    };
    setGlobalDragState(payload);

    try {
      e.dataTransfer.setData('application/hxl-node-id', node.id);
      e.dataTransfer.setData('application/hxl-component', node.type);
    } catch {}
    e.dataTransfer.setData('text/plain', serializeHxlDrag(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTreeDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggingNodeId(null);
    setDropTarget(null);
    clearDragStateImmediately();
  };

  const handleTreeDragOver = (e: React.DragEvent, node: HXLNode) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDrag = getGlobalDragState();
    const sourceId = currentDrag?.nodeId || draggingNodeId;

    if (sourceId === node.id) {
      setDropTarget(null);
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const ratio = rect.height > 0 ? offsetY / rect.height : 0.5;

    const doc = HXL_COMPONENTS.find((c) => c.type === node.type);
    const canNest = Boolean(doc?.canHaveChildren);

    if (canNest) {
      if (ratio < 0.25) {
        setDropTarget({ id: node.id, position: 'before' });
      } else if (ratio > 0.75) {
        setDropTarget({ id: node.id, position: 'after' });
      } else {
        setDropTarget({ id: node.id, position: 'inside' });
      }
    } else {
      setDropTarget({
        id: node.id,
        position: ratio < 0.5 ? 'before' : 'after',
      });
    }
  };

  const handleTreeDragLeave = (e: React.DragEvent, node: HXLNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropTarget?.id === node.id) {
      setDropTarget(null);
    }
  };

  const handleTreeDrop = (e: React.DragEvent, node: HXLNode) => {
    e.preventDefault();
    e.stopPropagation();

    const targetPos = dropTarget?.id === node.id ? dropTarget.position : 'after';
    setDropTarget(null);
    setDraggingNodeId(null);

    const payload = parseHxlDragPayload(e);
    clearDragStateImmediately();

    if (!payload) return;

    if (payload.sourceType === 'canvas' && payload.nodeId) {
      if (payload.nodeId !== node.id) {
        onReorderNode(payload.nodeId, node.id, targetPos);
      }
    } else if (payload.sourceType === 'palette' && payload.componentType) {
      onInsertNode(payload.componentType, node.id);
    }
  };

  const renderTreeItem = (node: HXLNode, depth: number = 0, isLast: boolean = false) => {
    const isSelected = selectedNodeId === node.id;
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isCollapsed = collapsedNodes[node.id];
    const doc = HXL_COMPONENTS.find((c) => c.type === node.type);
    const isRoot = node.id === rootNode.id;
    const isDraggingThis = draggingNodeId === node.id;

    const isDropBefore = dropTarget?.id === node.id && dropTarget.position === 'before';
    const isDropAfter = dropTarget?.id === node.id && dropTarget.position === 'after';
    const isDropInside = dropTarget?.id === node.id && dropTarget.position === 'inside';

    return (
      <div key={node.id} className="flex flex-col select-none relative">
        {/* Drop indicator before line */}
        {isDropBefore && (
          <div className="h-1 bg-[#0070d2] rounded-full my-0.5 mx-2 z-20 flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#0070d2] -ml-1 border-2 border-white" />
          </div>
        )}

        <div
          draggable={!isRoot}
          onDragStart={(e) => handleTreeDragStart(e, node)}
          onDragEnd={handleTreeDragEnd}
          onDragOver={(e) => handleTreeDragOver(e, node)}
          onDragLeave={(e) => handleTreeDragLeave(e, node)}
          onDrop={(e) => handleTreeDrop(e, node)}
          onClick={() => onSelectNode(node.id)}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-md transition-all text-xs relative ${
            !isRoot ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
          } ${
            isDraggingThis ? 'opacity-30 bg-slate-200 border border-dashed border-slate-400' : ''
          } ${
            isDropInside ? 'bg-emerald-100 ring-2 ring-emerald-500 font-semibold' : ''
          } ${
            isSelected
              ? 'bg-blue-100 text-blue-900 font-semibold shadow-xs'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 14)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {!isRoot && (
              <span
                title="Drag row to reorder"
                className="text-slate-300 group-hover:text-slate-600 hover:text-[#0070d2] cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-3 h-3" />
              </span>
            )}

            {doc?.canHaveChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCollapse(node.id, e)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 inline-block" />
            )}

            <span className="font-mono text-2xs text-slate-600 font-medium">
              {node.type.replace('tile/', '')}
            </span>

            {/* Quick label hint if node has text or label */}
            {node.properties?.text && (
              <span className="text-3xs text-slate-400 truncate max-w-20">
                "{String(node.properties.text).substring(0, 15)}"
              </span>
            )}
            {node.properties?.label && (
              <span className="text-3xs text-slate-400 truncate max-w-20">
                "{String(node.properties.label).substring(0, 15)}"
              </span>
            )}

            {isDropInside && (
              <span className="text-3xs text-emerald-700 font-bold bg-emerald-200/70 px-1 rounded">
                ↳ Nest
              </span>
            )}
          </div>

          {/* Action buttons on hover */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
            {depth > 0 && (
              <>
                <button
                  type="button"
                  title="Move up"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveNode(node.id, 'up');
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900"
                >
                  <MoveUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveNode(node.id, 'down');
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900"
                >
                  <MoveDown className="w-3 h-3" />
                </button>
              </>
            )}

            <button
              type="button"
              title="Duplicate component"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateNode(node.id);
              }}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900"
            >
              <Copy className="w-3 h-3" />
            </button>

            {depth > 0 && (
              <button
                type="button"
                title="Delete component"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.id);
                }}
                className="p-1 hover:bg-rose-100 rounded text-rose-500 hover:text-rose-700"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Drop indicator after line */}
        {isDropAfter && (
          <div className="h-1 bg-[#0070d2] rounded-full my-0.5 mx-2 z-20 flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#0070d2] -ml-1 border-2 border-white" />
          </div>
        )}

        {/* Children rendering */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col">
            {node.children!.map((child, idx) =>
              renderTreeItem(child, depth + 1, idx === node.children!.length - 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white select-none">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Layout Hierarchy
          </span>
          <span className="text-3xs text-slate-400">Drag items to reorder & nest</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {renderTreeItem(rootNode, 0, true)}
      </div>
    </div>
  );
};
