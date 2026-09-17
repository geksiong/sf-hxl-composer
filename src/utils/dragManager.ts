import React, { useEffect, useState } from 'react';

export interface DragItem {
  sourceType: 'palette' | 'canvas';
  componentType?: string;
  nodeId?: string;
  label: string;
}

export interface HoverTarget {
  targetNodeId: string;
  position: 'inside' | 'before' | 'after';
  label?: string;
}

export type DropCallback = (source: DragItem, target: HoverTarget) => void;

export interface PointerDragState {
  isDragging: boolean;
  item: DragItem | null;
  hoverTarget: HoverTarget | null;
  x: number;
  y: number;
}

// Global active pointer drag state
let currentPointerState: PointerDragState = {
  isDragging: false,
  item: null,
  hoverTarget: null,
  x: 0,
  y: 0,
};

const pointerListeners = new Set<(state: PointerDragState) => void>();
let globalDropCallback: DropCallback | null = null;

export function registerGlobalDropCallback(cb: DropCallback): () => void {
  globalDropCallback = cb;
  return () => {
    if (globalDropCallback === cb) {
      globalDropCallback = null;
    }
  };
}

function notifyPointerListeners() {
  const snapshot = { ...currentPointerState };
  pointerListeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (err) {
      console.error('Error in pointer drag listener', err);
    }
  });
}

function findDropTargetAtPoint(
  x: number,
  y: number,
  draggingItem: DragItem | null
): HoverTarget | null {
  if (typeof document === 'undefined') return null;

  const elements = document.elementsFromPoint(x, y);
  if (!elements || elements.length === 0) return null;

  for (const el of elements) {
    const targetEl = el.closest('[data-hxl-target-id]') as HTMLElement | null;
    if (targetEl) {
      const targetId = targetEl.getAttribute('data-hxl-target-id');
      if (!targetId) continue;

      // Cannot drop onto itself
      if (draggingItem && draggingItem.nodeId && draggingItem.nodeId === targetId) {
        continue;
      }

      // Cannot drop parent into its own child (canvas wrapper or tree branch)
      if (draggingItem && draggingItem.nodeId) {
        const isCanvasDescendant = targetEl.closest(`[id="hxl-wrapper-${draggingItem.nodeId}"]`);
        const isTreeDescendant = targetEl.closest(`[data-hxl-tree-branch="${draggingItem.nodeId}"]`);
        if (isCanvasDescendant || isTreeDescendant) continue;
      }

      const rect = targetEl.getBoundingClientRect();
      const isHorizontal = targetEl.getAttribute('data-hxl-is-horizontal') === 'true';
      const canNest = targetEl.getAttribute('data-hxl-can-nest') === 'true';
      const isRoot = targetEl.getAttribute('data-hxl-is-root') === 'true';

      let ratio = 0.5;
      if (isHorizontal) {
        ratio = rect.width > 0 ? (x - rect.left) / rect.width : 0.5;
      } else {
        ratio = rect.height > 0 ? (y - rect.top) / rect.height : 0.5;
      }

      let position: 'inside' | 'before' | 'after' = 'inside';
      if (isRoot) {
        position = 'inside';
      } else if (canNest) {
        if (ratio < 0.25) {
          position = 'before';
        } else if (ratio > 0.75) {
          position = 'after';
        } else {
          position = 'inside';
        }
      } else {
        position = ratio < 0.5 ? 'before' : 'after';
      }

      return {
        targetNodeId: targetId,
        position,
      };
    }

    // Check if over canvas stage or tree outline stage
    const stageEl = (el.closest('[data-hxl-canvas-stage]') || el.closest('[data-hxl-tree-stage]')) as HTMLElement | null;
    if (stageEl) {
      const rootId = stageEl.getAttribute('data-root-id') || 'root_widget';
      return {
        targetNodeId: rootId,
        position: 'inside',
      };
    }
  }

  return null;
}

let activeMoveHandler: ((e: PointerEvent) => void) | null = null;
let activeUpHandler: ((e: PointerEvent) => void) | null = null;
let activeKeyHandler: ((e: KeyboardEvent) => void) | null = null;
let lastDragEndTime = 0;

export function wasRecentlyDragged(): boolean {
  return Date.now() - lastDragEndTime < 180;
}

export function cancelPointerDrag() {
  if (typeof document !== 'undefined') {
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  if (activeMoveHandler) {
    window.removeEventListener('pointermove', activeMoveHandler);
    activeMoveHandler = null;
  }
  if (activeUpHandler) {
    window.removeEventListener('pointerup', activeUpHandler);
    window.removeEventListener('pointercancel', activeUpHandler);
    activeUpHandler = null;
  }
  if (activeKeyHandler) {
    window.removeEventListener('keydown', activeKeyHandler);
    activeKeyHandler = null;
  }

  currentPointerState = {
    isDragging: false,
    item: null,
    hoverTarget: null,
    x: 0,
    y: 0,
  };
  setGlobalDragState(null);
  notifyPointerListeners();
}

export function startPointerDrag(item: DragItem, e: React.PointerEvent) {
  // Only handle main pointer button (left click or primary touch)
  if (e.button !== 0) return;

  // Clean up any lingering previous session
  cancelPointerDrag();

  const startX = e.clientX;
  const startY = e.clientY;
  const DRAG_THRESHOLD = 3; // pixels for immediate response
  let dragStarted = false;

  const onMove = (moveEvt: PointerEvent) => {
    const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
    if (!dragStarted) {
      if (dist >= DRAG_THRESHOLD) {
        dragStarted = true;
        if (typeof document !== 'undefined') {
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'grabbing';
        }
        currentPointerState.isDragging = true;
        currentPointerState.item = item;
        setGlobalDragState({
          sourceType: item.sourceType,
          nodeId: item.nodeId,
          componentType: item.componentType,
        });
      } else {
        return;
      }
    }

    currentPointerState.x = moveEvt.clientX;
    currentPointerState.y = moveEvt.clientY;
    currentPointerState.hoverTarget = findDropTargetAtPoint(
      moveEvt.clientX,
      moveEvt.clientY,
      item
    );
    notifyPointerListeners();
  };

  const onUp = (upEvt: PointerEvent) => {
    if (dragStarted) {
      lastDragEndTime = Date.now();
      if (currentPointerState.item && currentPointerState.hoverTarget) {
        const source = currentPointerState.item;
        const target = currentPointerState.hoverTarget;
        if (globalDropCallback) {
          try {
            globalDropCallback(source, target);
          } catch (err) {
            console.error('Error during drop execution', err);
          }
        }
      }
    }

    cancelPointerDrag();
  };

  const onKeyDown = (keyEvt: KeyboardEvent) => {
    if (keyEvt.key === 'Escape') {
      cancelPointerDrag();
    }
  };

  activeMoveHandler = onMove;
  activeUpHandler = onUp;
  activeKeyHandler = onKeyDown;

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });
  window.addEventListener('keydown', onKeyDown);
}

export function usePointerDragState(): PointerDragState {
  const [state, setState] = useState<PointerDragState>(() => ({ ...currentPointerState }));

  useEffect(() => {
    const update = (newState: PointerDragState) => setState(newState);
    pointerListeners.add(update);
    return () => {
      pointerListeners.delete(update);
    };
  }, []);

  return state;
}

export function useHoverTargetForNode(nodeId: string): 'inside' | 'before' | 'after' | null {
  const [position, setPosition] = useState<'inside' | 'before' | 'after' | null>(null);

  useEffect(() => {
    const update = (state: PointerDragState) => {
      if (state.isDragging && state.hoverTarget && state.hoverTarget.targetNodeId === nodeId) {
        setPosition(state.hoverTarget.position);
      } else {
        setPosition(null);
      }
    };
    pointerListeners.add(update);
    return () => {
      pointerListeners.delete(update);
    };
  }, [nodeId]);

  return position;
}

// -------------------------------------------------------------
// Backwards compatibility layer for legacy code
// -------------------------------------------------------------

export interface GlobalDragState {
  sourceType: 'palette' | 'canvas';
  nodeId?: string;
  componentType?: string;
}

type LegacyDragListener = (state: GlobalDragState | null) => void;
const legacyListeners = new Set<LegacyDragListener>();
let activeLegacyDragState: GlobalDragState | null = null;
let lastLegacyDragState: GlobalDragState | null = null;

export function setGlobalDragState(state: GlobalDragState | null) {
  activeLegacyDragState = state;
  if (state) {
    lastLegacyDragState = state;
  }
  legacyListeners.forEach((fn) => {
    try {
      fn(activeLegacyDragState);
    } catch {}
  });
}

export function getGlobalDragState(): GlobalDragState | null {
  return activeLegacyDragState;
}

export function getLastDragState(): GlobalDragState | null {
  return activeLegacyDragState || lastLegacyDragState;
}

export function clearDragStateImmediately() {
  cancelPointerDrag();
}

export function cancelDrag() {
  cancelPointerDrag();
}

export function serializeHxlDrag(payload: GlobalDragState): string {
  return JSON.stringify({
    __hxl: true,
    sourceType: payload.sourceType,
    nodeId: payload.nodeId,
    componentType: payload.componentType,
  });
}

export function parseHxlDragPayload(e?: React.DragEvent | DragEvent): GlobalDragState | null {
  if (currentPointerState.item) {
    return {
      sourceType: currentPointerState.item.sourceType,
      nodeId: currentPointerState.item.nodeId,
      componentType: currentPointerState.item.componentType,
    };
  }
  return activeLegacyDragState || lastLegacyDragState;
}

export function subscribeGlobalDragState(listener: LegacyDragListener): () => void {
  legacyListeners.add(listener);
  return () => {
    legacyListeners.delete(listener);
  };
}

export function useGlobalDrag(): GlobalDragState | null {
  const [dragState, setDragState] = useState<GlobalDragState | null>(() => getGlobalDragState());

  useEffect(() => {
    return subscribeGlobalDragState((state) => {
      setDragState(state);
    });
  }, []);

  return dragState;
}
