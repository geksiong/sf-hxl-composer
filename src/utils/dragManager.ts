import React, { useEffect, useState } from 'react';

export interface GlobalDragState {
  sourceType: 'palette' | 'canvas';
  nodeId?: string;
  componentType?: string;
}

type DragListener = (state: GlobalDragState | null) => void;
const listeners = new Set<DragListener>();
let activeDragState: GlobalDragState | null = null;
let lastDragState: GlobalDragState | null = null;
let clearLastTimer: any = null;

export function setGlobalDragState(state: GlobalDragState | null) {
  if (state) {
    activeDragState = state;
    lastDragState = state;
    if (clearLastTimer) {
      clearTimeout(clearLastTimer);
      clearLastTimer = null;
    }
  } else {
    activeDragState = null;
    if (clearLastTimer) clearTimeout(clearLastTimer);
    clearLastTimer = setTimeout(() => {
      lastDragState = null;
      clearLastTimer = null;
    }, 400);
  }

  listeners.forEach((listener) => {
    try {
      listener(activeDragState);
    } catch (err) {
      console.error('Error in drag listener', err);
    }
  });
}

export function getGlobalDragState(): GlobalDragState | null {
  return activeDragState;
}

export function getLastDragState(): GlobalDragState | null {
  return activeDragState || lastDragState;
}

export function clearDragStateImmediately() {
  activeDragState = null;
  if (clearLastTimer) {
    clearTimeout(clearLastTimer);
  }
  // Retain lastDragState briefly so any simultaneous drop handlers can resolve payload
  clearLastTimer = setTimeout(() => {
    lastDragState = null;
    clearLastTimer = null;
  }, 400);

  listeners.forEach((listener) => {
    try {
      listener(null);
    } catch (err) {
      console.error('Error in drag listener', err);
    }
  });
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
  // 1. In-memory state (fastest and most reliable)
  const current = getGlobalDragState() || getLastDragState();
  if (current && (current.nodeId || current.componentType)) {
    return current;
  }

  if (!e || !e.dataTransfer) return null;

  // 2. Structured JSON from standard text/plain
  try {
    const rawText = e.dataTransfer.getData('text/plain');
    if (rawText) {
      const parsed = JSON.parse(rawText);
      if (parsed && parsed.__hxl) {
        return {
          sourceType: parsed.sourceType,
          nodeId: parsed.nodeId,
          componentType: parsed.componentType,
        };
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  // 3. Custom MIME types
  try {
    const nodeId = e.dataTransfer.getData('application/hxl-node-id');
    const compType = e.dataTransfer.getData('application/hxl-component');
    if (nodeId) {
      return {
        sourceType: 'canvas',
        nodeId,
        componentType: compType || undefined,
      };
    }
    if (compType && compType.startsWith('tile/')) {
      return {
        sourceType: 'palette',
        componentType: compType,
      };
    }
  } catch {}

  // 4. Fallback text/plain if it's explicitly a tile type
  try {
    const plain = e.dataTransfer.getData('text/plain');
    if (plain && plain.startsWith('tile/')) {
      return {
        sourceType: 'palette',
        componentType: plain,
      };
    }
  } catch {}

  return null;
}

export function subscribeGlobalDragState(listener: DragListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
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

// Global window cleanup safety: ensures drag state never gets permanently stuck
if (typeof window !== 'undefined') {
  window.addEventListener('dragend', () => {
    setTimeout(() => {
      clearDragStateImmediately();
    }, 50);
  });

  window.addEventListener('mouseup', () => {
    if (activeDragState) {
      setTimeout(() => {
        clearDragStateImmediately();
      }, 50);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (activeDragState || lastDragState)) {
      clearDragStateImmediately();
    }
  });
}



