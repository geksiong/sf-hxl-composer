import React from 'react';
import { usePointerDragState } from '../utils/dragManager';
import { Box, Layers, Move, Plus } from 'lucide-react';

export const DragOverlay: React.FC = () => {
  const dragState = usePointerDragState();

  if (!dragState.isDragging || !dragState.item) {
    return null;
  }

  const { item, hoverTarget, x, y } = dragState;

  return (
    <div
      style={{
        transform: `translate3d(${x + 14}px, ${y + 14}px, 0)`,
      }}
      className="fixed top-0 left-0 pointer-events-none z-[99999] select-none transition-transform duration-75 ease-out"
    >
      <div className="bg-slate-900/90 text-white rounded-lg shadow-2xl border border-slate-700/80 px-3 py-2 flex flex-col gap-1 backdrop-blur-xs min-w-[160px] max-w-[260px]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-500/20 text-blue-400">
            {item.sourceType === 'palette' ? (
              <Plus className="w-3.5 h-3.5" />
            ) : (
              <Move className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-100 truncate">
              {item.label}
            </div>
            <div className="text-3xs text-slate-400 font-mono">
              {item.sourceType === 'palette' ? 'Add component' : 'Moving item'}
            </div>
          </div>
        </div>

        {hoverTarget ? (
          <div className="pt-1 mt-0.5 border-t border-slate-700/50 flex items-center justify-between text-3xs">
            <span className="text-emerald-400 font-medium">
              {hoverTarget.position === 'inside' && '↳ Drop inside'}
              {hoverTarget.position === 'before' && '↑ Drop before'}
              {hoverTarget.position === 'after' && '↓ Drop after'}
            </span>
            <span className="text-slate-400 font-mono truncate max-w-[100px]">
              {hoverTarget.targetNodeId}
            </span>
          </div>
        ) : (
          <div className="pt-1 mt-0.5 border-t border-slate-700/50 text-3xs text-slate-400 italic">
            Drag over canvas or tree to place
          </div>
        )}
      </div>
    </div>
  );
};
