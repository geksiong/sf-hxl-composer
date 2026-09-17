import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Box,
  Briefcase,
  Check,
  CheckCircle,
  Clock,
  Columns3,
  Copy,
  Download,
  ExternalLink,
  File,
  FileText,
  FolderOpen,
  GripVertical,
  Info,
  Layers,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minus,
  MousePointerClick,
  Rows3,
  ShieldCheck,
  Sparkles,
  Table2,
  Tag,
  Trash,
  Type,
  User,
} from 'lucide-react';
import { HXLNode, SurfaceType } from '../types/hxl';
import { canComponentHaveChildren, evaluateExpression } from '../utils/hxlUtils';
import {
  getGlobalDragState,
  getLastDragState,
  setGlobalDragState,
  useGlobalDrag,
  serializeHxlDrag,
  parseHxlDragPayload,
  clearDragStateImmediately,
} from '../utils/dragManager';

export interface DropPayload {
  sourceType: 'palette' | 'canvas';
  componentType?: string;
  sourceNodeId?: string;
  targetNodeId: string;
  position: 'inside' | 'before' | 'after';
}

interface HXLNodeRendererProps {
  node: HXLNode;
  mockData: Record<string, any>;
  selectedNodeId: string | null;
  onSelectNode: (id: string, e: React.MouseEvent) => void;
  surface: SurfaceType;
  onDropPayload?: (payload: DropPayload) => void;
  isDragging?: boolean;
  isRoot?: boolean;
  parentType?: string;
}

export const HXLNodeRenderer: React.FC<HXLNodeRendererProps> = ({
  node,
  mockData,
  selectedNodeId,
  onSelectNode,
  surface,
  onDropPayload,
  isDragging,
  isRoot: propIsRoot,
  parentType,
}) => {
  const isSelected = selectedNodeId === node.id;
  const rawProps = node.properties || {};

  // Evaluate all expression tokens {!$attrs.xxx} with live mockData
  const p: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawProps)) {
    p[k] = evaluateExpression(v, mockData);
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(node.id, e);
  };

  const isRoot = Boolean(
    propIsRoot || node.id === 'root' || node.id === 'root_widget' || node.type === 'tile/widget'
  );
  const canHaveChildren = canComponentHaveChildren(node.type);

  const activeDrag = useGlobalDrag();
  const isThisNodeDragging = Boolean(activeDrag?.sourceType === 'canvas' && activeDrag?.nodeId === node.id);
  const [dropPosition, setDropPosition] = useState<'inside' | 'before' | 'after' | null>(null);
  const dragEnterCounter = React.useRef(0);

  const handleDragStart = (e: React.DragEvent) => {
    if (isRoot) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    const payload = {
      sourceType: 'canvas' as const,
      nodeId: node.id,
      componentType: node.type,
    };
    setGlobalDragState(payload);

    const serialized = serializeHxlDrag(payload);
    try {
      e.dataTransfer.setData('application/hxl-node-id', node.id);
      e.dataTransfer.setData('application/hxl-component', node.type);
    } catch {}
    e.dataTransfer.setData('text/plain', serialized);
    e.dataTransfer.effectAllowed = 'move';

    // Optional drag image setting
    const wrapper = document.getElementById(`hxl-wrapper-${node.id}`);
    if (wrapper && e.dataTransfer.setDragImage) {
      try {
        e.dataTransfer.setDragImage(wrapper, 20, 20);
      } catch {}
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropPosition(null);
    dragEnterCounter.current = 0;
    clearDragStateImmediately();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragEnterCounter.current++;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDrag = getGlobalDragState() || getLastDragState();
    if (!currentDrag) return;

    // Prevent dropping onto oneself
    if (currentDrag.sourceType === 'canvas' && currentDrag.nodeId === node.id) {
      setDropPosition(null);
      return;
    }

    e.dataTransfer.dropEffect = currentDrag.sourceType === 'palette' ? 'copy' : 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const isHorizontal = parentType === 'tile/row';

    if (isHorizontal) {
      const offsetX = e.clientX - rect.left;
      const ratio = rect.width > 0 ? offsetX / rect.width : 0.5;

      if (canHaveChildren) {
        if (ratio < 0.25) {
          setDropPosition('before');
        } else if (ratio > 0.75) {
          setDropPosition('after');
        } else {
          setDropPosition('inside');
        }
      } else {
        setDropPosition(ratio < 0.5 ? 'before' : 'after');
      }
    } else {
      const offsetY = e.clientY - rect.top;
      const ratio = rect.height > 0 ? offsetY / rect.height : 0.5;

      if (canHaveChildren) {
        if (ratio < 0.25 && !isRoot) {
          setDropPosition('before');
        } else if (ratio > 0.75 && !isRoot) {
          setDropPosition('after');
        } else {
          setDropPosition('inside');
        }
      } else {
        setDropPosition(ratio < 0.5 ? 'before' : 'after');
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragEnterCounter.current = Math.max(0, dragEnterCounter.current - 1);
    if (dragEnterCounter.current === 0) {
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragEnterCounter.current = 0;

    const currentPos = dropPosition || (canHaveChildren ? 'inside' : 'after');
    setDropPosition(null);

    const payload = parseHxlDragPayload(e);
    clearDragStateImmediately();

    if (!payload || !onDropPayload) return;

    if (payload.sourceType === 'canvas' && payload.nodeId) {
      if (payload.nodeId !== node.id) {
        onDropPayload({
          sourceType: 'canvas',
          sourceNodeId: payload.nodeId,
          targetNodeId: node.id,
          position: currentPos,
        });
      }
    } else if (payload.sourceType === 'palette' && payload.componentType) {
      onDropPayload({
        sourceType: 'palette',
        componentType: payload.componentType,
        targetNodeId: node.id,
        position: currentPos,
      });
    }
  };

  const dragDropProps = {
    draggable: !isRoot,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  const appendZoneProps = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setDropPosition('inside');
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropPosition(null);

      const payload = parseHxlDragPayload(e);
      clearDragStateImmediately();
      if (!payload || !onDropPayload) return;

      if (payload.sourceType === 'canvas' && payload.nodeId) {
        if (payload.nodeId !== node.id) {
          onDropPayload({
            sourceType: 'canvas',
            sourceNodeId: payload.nodeId,
            targetNodeId: node.id,
            position: 'inside',
          });
        }
      } else if (payload.sourceType === 'palette' && payload.componentType) {
        onDropPayload({
          sourceType: 'palette',
          componentType: payload.componentType,
          targetNodeId: node.id,
          position: 'inside',
        });
      }
    },
  };

  // Base selection outline wrapper
  const wrapperClass = `relative transition-all duration-150 cursor-pointer ${
    isSelected
      ? 'ring-2 ring-[#0070d2] ring-offset-2 z-10'
      : 'hover:ring-1 hover:ring-blue-300'
  } ${dropPosition === 'inside' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''}`;

  // -------------------------------------------------------------
  // Render Specific Component
  // -------------------------------------------------------------
  const renderContent = () => {
    switch (node.type) {
      // 1. Container / Card
      case 'tile/container': {
        const paddingMap: Record<string, string> = {
          none: 'p-0',
          small: 'p-2.5',
          medium: 'p-4',
          large: 'p-6',
        };
        const radiusMap: Record<string, string> = {
          none: 'rounded-none',
          small: 'rounded',
          medium: 'rounded-lg',
          large: 'rounded-xl',
        };
        const variantClass =
          p.variant === 'subtle'
            ? 'bg-slate-50 border border-slate-200'
            : p.variant === 'bordered'
            ? 'bg-transparent border border-slate-300'
            : p.variant === 'plain'
            ? 'bg-transparent'
            : 'bg-white border border-slate-200 shadow-sm';

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} ${variantClass} ${radiusMap[p.rounded || 'medium']} ${
              paddingMap[p.padding || 'medium']
            } flex flex-col gap-3 min-w-48`}
          >
            {node.children && node.children.length > 0 ? (
              <>
                {node.children.map((child) => (
                  <HXLNodeRenderer
                    key={child.id}
                    node={child}
                    mockData={mockData}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={onSelectNode}
                    surface={surface}
                    onDropPayload={onDropPayload}
                    isDragging={isDragging}
                    isRoot={false}
                    parentType={node.type}
                  />
                ))}
                {activeDrag && (
                  <div
                    {...appendZoneProps}
                    className="border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 rounded py-1.5 px-3 text-center text-3xs text-blue-600 font-medium transition-colors"
                  >
                    + Append into Container
                  </div>
                )}
              </>
            ) : (
              <div
                {...appendZoneProps}
                className="border-2 border-dashed border-blue-300 bg-blue-50/40 rounded p-4 text-center text-xs text-blue-600 font-medium hover:bg-blue-50/70 transition-colors"
              >
                + Drop components into Container
              </div>
            )}
          </div>
        );
      }

      // 2. Column
      case 'tile/column': {
        const gapMap: Record<string, string> = {
          none: 'gap-0',
          'x-small': 'gap-1',
          small: 'gap-2',
          medium: 'gap-3',
          large: 'gap-5',
        };
        const alignMap: Record<string, string> = {
          stretch: 'items-stretch',
          start: 'items-start',
          center: 'items-center',
          end: 'items-end',
        };
        const widthClass =
          p.width === 'half'
            ? 'w-1/2'
            : p.width === 'auto'
            ? 'w-auto'
            : p.width === 'flex-1'
            ? 'flex-1'
            : 'w-full';

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} flex flex-col ${gapMap[p.gap || 'medium']} ${
              alignMap[p.align || 'stretch']
            } ${widthClass} min-h-6`}
          >
            {node.children && node.children.length > 0 ? (
              <>
                {node.children.map((child) => (
                  <HXLNodeRenderer
                    key={child.id}
                    node={child}
                    mockData={mockData}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={onSelectNode}
                    surface={surface}
                    onDropPayload={onDropPayload}
                    isDragging={isDragging}
                    isRoot={false}
                    parentType={node.type}
                  />
                ))}
                {activeDrag && (
                  <div
                    {...appendZoneProps}
                    className="border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 rounded py-1.5 px-3 text-center text-3xs text-blue-600 font-medium transition-colors"
                  >
                    + Append into Column
                  </div>
                )}
              </>
            ) : (
              <div
                {...appendZoneProps}
                className="border-2 border-dashed border-blue-300 bg-blue-50/40 rounded p-3 text-center text-xs text-blue-600 font-medium w-full hover:bg-blue-50/70 transition-colors"
              >
                + Drop components into Column
              </div>
            )}
          </div>
        );
      }

      // 3. Row
      case 'tile/row': {
        const gapMap: Record<string, string> = {
          none: 'gap-0',
          'x-small': 'gap-1.5',
          small: 'gap-2.5',
          medium: 'gap-4',
          large: 'gap-6',
        };
        const alignMap: Record<string, string> = {
          center: 'items-center',
          start: 'items-start',
          end: 'items-end',
          stretch: 'items-stretch',
        };
        const justifyMap: Record<string, string> = {
          start: 'justify-start',
          center: 'justify-center',
          end: 'justify-end',
          'space-between': 'justify-between',
          'space-around': 'justify-around',
        };

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} flex flex-row ${gapMap[p.gap || 'medium']} ${
              alignMap[p.align || 'center']
            } ${justifyMap[p.justify || 'start']} ${
              p.wrap ? 'flex-wrap' : 'flex-nowrap'
            } w-full min-h-6`}
          >
            {node.children && node.children.length > 0 ? (
              <>
                {node.children.map((child) => (
                  <HXLNodeRenderer
                    key={child.id}
                    node={child}
                    mockData={mockData}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={onSelectNode}
                    surface={surface}
                    onDropPayload={onDropPayload}
                    isDragging={isDragging}
                    isRoot={false}
                    parentType={node.type}
                  />
                ))}
                {activeDrag && (
                  <div
                    {...appendZoneProps}
                    className="border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 rounded px-2.5 py-1 text-center text-3xs text-blue-600 font-medium self-stretch flex items-center justify-center shrink-0 transition-colors"
                  >
                    + Append
                  </div>
                )}
              </>
            ) : (
              <div
                {...appendZoneProps}
                className="border-2 border-dashed border-blue-300 bg-blue-50/40 rounded p-3 text-center text-xs text-blue-600 font-medium w-full hover:bg-blue-50/70 transition-colors"
              >
                + Drop components into Row
              </div>
            )}
          </div>
        );
      }

      // 4. Text
      case 'tile/text': {
        const variantClassMap: Record<string, string> = {
          h1: 'text-2xl font-bold text-slate-900 tracking-tight',
          h2: 'text-xl font-bold text-slate-900 tracking-tight',
          h3: 'text-base font-bold text-slate-900',
          h4: 'text-sm font-semibold text-slate-800',
          body: 'text-xs text-slate-700 leading-relaxed',
          caption: 'text-2xs text-slate-500 uppercase font-semibold tracking-wider',
          overline: 'text-3xs uppercase font-bold text-slate-400 tracking-widest',
        };
        const weightMap: Record<string, string> = {
          normal: 'font-normal',
          medium: 'font-medium',
          semibold: 'font-semibold',
          bold: 'font-bold',
        };
        const colorMap: Record<string, string> = {
          default: '',
          muted: 'text-slate-500',
          brand: 'text-[#0070d2]',
          success: 'text-emerald-600',
          warning: 'text-amber-600',
          error: 'text-rose-600',
        };

        const alignMap: Record<string, string> = {
          left: 'text-left',
          center: 'text-center',
          right: 'text-right',
        };

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} ${variantClassMap[p.variant || 'body']} ${
              weightMap[p.weight || 'normal']
            } ${colorMap[p.color || 'default']} ${alignMap[p.align || 'left']} ${
              p.truncate ? 'truncate' : ''
            }`}
          >
            {p.text || '(Empty text)'}
          </div>
        );
      }

      // 5. Button
      case 'tile/button': {
        const variantMap: Record<string, string> = {
          brand: 'bg-[#0070d2] text-white hover:bg-blue-700 border-transparent shadow-xs',
          neutral: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs',
          destructive: 'bg-rose-600 text-white hover:bg-rose-700 border-transparent shadow-xs',
          outline: 'bg-transparent text-[#0070d2] border-[#0070d2] hover:bg-blue-50',
          ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
        };
        const sizeMap: Record<string, string> = {
          small: 'px-2.5 py-1 text-2xs',
          medium: 'px-3.5 py-1.5 text-xs',
          large: 'px-4.5 py-2 text-sm',
        };

        const renderIcon = () => {
          if (p.icon === 'arrow-right') return <ArrowRight className="w-3.5 h-3.5 ml-1" />;
          if (p.icon === 'check') return <Check className="w-3.5 h-3.5 mr-1" />;
          if (p.icon === 'download') return <Download className="w-3.5 h-3.5 mr-1" />;
          if (p.icon === 'trash') return <Trash className="w-3.5 h-3.5 mr-1" />;
          return null;
        };

        return (
          <button
            id={node.id}
            type="button"
            onClick={handleClick}
            disabled={p.disabled}
            className={`${wrapperClass} ${variantMap[p.variant || 'brand']} ${
              sizeMap[p.size || 'medium']
            } ${p.fullWidth ? 'w-full justify-center' : 'inline-flex'} ${
              p.disabled ? 'opacity-50 cursor-not-allowed' : ''
            } rounded-md font-semibold border items-center gap-1.5 transition-colors pointer-events-none`}
          >
            {p.icon !== 'arrow-right' && renderIcon()}
            <span>{p.label || 'Button'}</span>
            {p.icon === 'arrow-right' && renderIcon()}
          </button>
        );
      }

      // 6. Badge
      case 'tile/badge': {
        const variantMap: Record<string, string> = {
          neutral: 'bg-slate-100 text-slate-700 border-slate-200',
          brand: 'bg-blue-50 text-[#0070d2] border-blue-200',
          success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          warning: 'bg-amber-50 text-amber-700 border-amber-200',
          error: 'bg-rose-50 text-rose-700 border-rose-200',
          inverse: 'bg-slate-800 text-white border-transparent',
        };
        const sizeMap: Record<string, string> = {
          small: 'text-3xs px-1.5 py-0.5',
          medium: 'text-2xs px-2 py-0.5',
        };

        return (
          <span
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} ${variantMap[p.variant || 'neutral']} ${
              sizeMap[p.size || 'medium']
            } inline-flex items-center font-semibold rounded-full border border-solid`}
          >
            {p.label || 'Badge'}
          </span>
        );
      }

      // 7. Callout
      case 'tile/callout': {
        const variantClassMap: Record<string, { bg: string; border: string; icon: any; iconColor: string }> = {
          info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            icon: Info,
            iconColor: 'text-[#0070d2]',
          },
          tip: {
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            icon: Sparkles,
            iconColor: 'text-indigo-600',
          },
          warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            icon: AlertTriangle,
            iconColor: 'text-amber-600',
          },
          error: {
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            icon: AlertCircle,
            iconColor: 'text-rose-600',
          },
          success: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            icon: ShieldCheck,
            iconColor: 'text-emerald-600',
          },
        };

        const config = variantClassMap[p.variant || 'info'] || variantClassMap.info;
        const IconComponent = config.icon;

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} ${config.bg} ${config.border} border rounded-lg p-3 flex items-start gap-2.5 w-full`}
          >
            <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${config.iconColor}`} />
            <div className="flex-1 min-w-0">
              {p.title && (
                <div className="text-xs font-semibold text-slate-800 mb-0.5">{p.title}</div>
              )}
              {p.description && (
                <div className="text-xs text-slate-600 leading-relaxed">{p.description}</div>
              )}
            </div>
          </div>
        );
      }

      // 8. Progress
      case 'tile/progress': {
        const val = Math.min(100, Math.max(0, Number(p.value) || 0));
        const variantColor: Record<string, string> = {
          brand: 'bg-[#0070d2]',
          success: 'bg-emerald-500',
          warning: 'bg-amber-500',
          error: 'bg-rose-500',
        };

        return (
          <div id={node.id} onClick={handleClick} className={`${wrapperClass} flex flex-col gap-1 w-full`}>
            {(p.label || p.showValueText) && (
              <div className="flex justify-between items-center text-2xs font-semibold text-slate-600">
                <span>{p.label}</span>
                {p.showValueText && <span>{val}%</span>}
              </div>
            )}
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  variantColor[p.variant || 'brand']
                }`}
                style={{ width: `${val}%` }}
              />
            </div>
          </div>
        );
      }

      // 9. Table
      case 'tile/table': {
        let columns: any[] = [];
        let rows: any[] = [];

        try {
          columns = typeof p.columns === 'string' ? JSON.parse(p.columns) : p.columns || [];
        } catch {
          columns = [];
        }

        try {
          rows = typeof p.rows === 'string' ? JSON.parse(p.rows) : p.rows || [];
        } catch {
          rows = [];
        }

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} w-full border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs`}
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {columns.map((col: any, idx: number) => (
                    <th key={idx} className="p-2.5 font-semibold text-slate-700">
                      {col.label || col.field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80">
                    {columns.map((col: any, cIdx: number) => (
                      <td key={cIdx} className="p-2.5 text-slate-600">
                        {String(row[col.field] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // 10. Avatar
      case 'tile/avatar': {
        const sizeClass =
          p.size === 'small' ? 'w-6 h-6 text-2xs' : p.size === 'large' ? 'w-12 h-12 text-base' : 'w-8 h-8 text-xs';
        const shapeClass = p.shape === 'square' ? 'rounded-md' : 'rounded-full';

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} ${sizeClass} ${shapeClass} bg-[#0070d2] text-white flex items-center justify-center font-bold overflow-hidden shadow-2xs`}
          >
            {p.src ? (
              <img src={p.src} alt={p.initials || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <span>{p.initials || 'U'}</span>
            )}
          </div>
        );
      }

      // 11. Icon
      case 'tile/icon': {
        const sizeClass =
          p.size === 'small' ? 'w-3.5 h-3.5' : p.size === 'large' ? 'w-6 h-6' : 'w-4.5 h-4.5';
        const colorClass: Record<string, string> = {
          default: 'text-slate-600',
          brand: 'text-[#0070d2]',
          success: 'text-emerald-600',
          warning: 'text-amber-600',
          error: 'text-rose-600',
        };

        const renderNamedIcon = () => {
          switch (p.name) {
            case 'sparkles': return <Sparkles className={`${sizeClass} ${colorClass[p.color || 'brand']}`} />;
            case 'check-circle': return <CheckCircle className={`${sizeClass} ${colorClass[p.color || 'success']}`} />;
            case 'alert-circle': return <AlertCircle className={`${sizeClass} ${colorClass[p.color || 'error']}`} />;
            case 'clock': return <Clock className={`${sizeClass} ${colorClass[p.color || 'default']}`} />;
            case 'briefcase': return <Briefcase className={`${sizeClass} ${colorClass[p.color || 'default']}`} />;
            case 'user': return <User className={`${sizeClass} ${colorClass[p.color || 'default']}`} />;
            case 'layers': return <Layers className={`${sizeClass} ${colorClass[p.color || 'default']}`} />;
            default: return <Box className={`${sizeClass} ${colorClass[p.color || 'default']}`} />;
          }
        };

        return (
          <div id={node.id} onClick={handleClick} className={`${wrapperClass} inline-flex items-center`}>
            {renderNamedIcon()}
          </div>
        );
      }

      // 12. Link
      case 'tile/link': {
        return (
          <a
            id={node.id}
            href={p.href || '#'}
            onClick={handleClick}
            target={p.openInNewTab ? '_blank' : '_self'}
            rel="noreferrer"
            className={`${wrapperClass} inline-flex items-center gap-1 text-xs text-[#0070d2] hover:underline font-medium`}
          >
            <span>{p.label || 'Link'}</span>
            {p.openInNewTab && <ExternalLink className="w-3 h-3" />}
          </a>
        );
      }

      // 13. Markdown
      case 'tile/markdown': {
        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} text-xs text-slate-700 leading-relaxed prose prose-sm max-w-none`}
          >
            {p.content || ''}
          </div>
        );
      }

      // 14. Code
      case 'tile/code': {
        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-2xs overflow-x-auto w-full`}
          >
            {p.title && (
              <div className="text-3xs text-slate-400 mb-1 border-b border-slate-800 pb-1 font-sans">
                {p.title}
              </div>
            )}
            <pre>
              <code>{p.code || ''}</code>
            </pre>
          </div>
        );
      }

      // 15. Separator
      case 'tile/separator': {
        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} ${
              p.orientation === 'vertical' ? 'w-px h-6 bg-slate-200' : 'w-full h-px bg-slate-200 my-1'
            }`}
          />
        );
      }

      // 16. Spacer
      case 'tile/spacer': {
        const sizeMap: Record<string, string> = {
          small: 'h-2',
          medium: 'h-4',
          large: 'h-8',
        };
        return <div id={node.id} onClick={handleClick} className={`${wrapperClass} w-full ${sizeMap[p.size || 'medium']}`} />;
      }

      // 17. Image
      case 'tile/image': {
        const aspectClass =
          p.aspectRatio === '16:9'
            ? 'aspect-video'
            : p.aspectRatio === '4:3'
            ? 'aspect-4/3'
            : p.aspectRatio === '1:1'
            ? 'aspect-square'
            : '';

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} w-full overflow-hidden ${
              p.rounded ? 'rounded-lg' : ''
            } bg-slate-100 border border-slate-200`}
          >
            <img
              src={p.src}
              alt={p.alt || 'HXL Image'}
              referrerPolicy="no-referrer"
              className={`w-full object-cover ${aspectClass}`}
            />
          </div>
        );
      }

      // 18. Spinner
      case 'tile/spinner': {
        const sizeClass =
          p.size === 'small' ? 'w-4 h-4' : p.size === 'large' ? 'w-8 h-8' : 'w-5 h-5';

        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} inline-flex items-center gap-2 text-xs text-slate-500`}
          >
            <Loader2 className={`animate-spin text-[#0070d2] ${sizeClass}`} />
            {p.label && <span>{p.label}</span>}
          </div>
        );
      }

      // 19. List
      case 'tile/list': {
        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} flex flex-col ${
              p.bordered ? 'border border-slate-200 rounded-lg overflow-hidden' : ''
            } ${p.divided ? 'divide-y divide-slate-100' : ''} bg-white w-full`}
          >
            {node.children && node.children.length > 0 ? (
              <>
                {node.children.map((child) => (
                  <HXLNodeRenderer
                    key={child.id}
                    node={child}
                    mockData={mockData}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={onSelectNode}
                    surface={surface}
                    onDropPayload={onDropPayload}
                    isDragging={isDragging}
                    isRoot={false}
                    parentType={node.type}
                  />
                ))}
                {activeDrag && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropPosition('inside');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setDropPosition(null);
                    }}
                    onDrop={handleDrop}
                    className="p-2 text-center text-3xs text-blue-600 font-medium border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 transition-colors"
                  >
                    + Append into List
                  </div>
                )}
              </>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDropPosition('inside');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDropPosition(null);
                }}
                onDrop={handleDrop}
                className="p-3 text-center text-xs text-blue-500 font-medium border-2 border-dashed border-blue-200 bg-blue-50/30 rounded"
              >
                + Drop items into List
              </div>
            )}
          </div>
        );
      }

      // 20. List Item
      case 'tile/listItem': {
        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {p.icon === 'check-circle' && (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              {p.icon === 'alert-circle' && (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              {p.icon === 'clock' && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
              {p.icon === 'file' && <File className="w-4 h-4 text-blue-500 shrink-0" />}

              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-800 truncate">{p.title}</div>
                {p.subtitle && (
                  <div className="text-2xs text-slate-500 truncate">{p.subtitle}</div>
                )}
              </div>
            </div>

            {p.badgeText && (
              <span className="text-2xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium shrink-0">
                {p.badgeText}
              </span>
            )}
          </div>
        );
      }

      // 21. Accordion
      case 'tile/accordion': {
        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200 w-full bg-white`}
          >
            {node.children && node.children.length > 0 ? (
              <>
                {node.children.map((child) => (
                  <HXLNodeRenderer
                    key={child.id}
                    node={child}
                    mockData={mockData}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={onSelectNode}
                    surface={surface}
                    onDropPayload={onDropPayload}
                    isDragging={isDragging}
                    isRoot={false}
                    parentType={node.type}
                  />
                ))}
                {activeDrag && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropPosition('inside');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setDropPosition(null);
                    }}
                    onDrop={handleDrop}
                    className="p-2 text-center text-3xs text-blue-600 font-medium border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 transition-colors"
                  >
                    + Append into Accordion
                  </div>
                )}
              </>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDropPosition('inside');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDropPosition(null);
                }}
                onDrop={handleDrop}
                className="p-3 text-center text-xs text-blue-500 font-medium border-2 border-dashed border-blue-200 bg-blue-50/30 rounded"
              >
                + Drop items into Accordion
              </div>
            )}
          </div>
        );
      }

      // 22. Accordion Item
      case 'tile/accordionItem': {
        return (
          <div id={node.id} onClick={handleClick} className={`${wrapperClass} w-full`}>
            <div className="bg-slate-50 px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-700 select-none">
              <span>{p.title || 'Accordion Header'}</span>
              <span className="text-slate-400 font-mono text-sm">{p.isOpen ? '−' : '+'}</span>
            </div>
            {p.isOpen && (
              <div className="p-3 bg-white flex flex-col gap-2">
                {node.children && node.children.length > 0 ? (
                  <>
                    {node.children.map((child) => (
                      <HXLNodeRenderer
                        key={child.id}
                        node={child}
                        mockData={mockData}
                        selectedNodeId={selectedNodeId}
                        onSelectNode={onSelectNode}
                        surface={surface}
                        onDropPayload={onDropPayload}
                        isDragging={isDragging}
                        isRoot={false}
                        parentType={node.type}
                      />
                    ))}
                    {activeDrag && (
                      <div
                        {...appendZoneProps}
                        className="text-3xs text-blue-600 font-medium text-center py-1.5 border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 rounded transition-colors"
                      >
                        + Append panel item
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    {...appendZoneProps}
                    className="text-2xs text-blue-500 font-medium text-center py-2 border border-dashed border-blue-200 bg-blue-50/30 rounded"
                  >
                    + Drop panel content here
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      // Root Widget fallback
      case 'tile/widget':
      default: {
        return (
          <div
            id={node.id}
            onClick={handleClick}
            className={`${wrapperClass} flex flex-col gap-3 w-full`}
          >
            {node.children && (
              <>
                {node.children.map((child) => (
                  <HXLNodeRenderer
                    key={child.id}
                    node={child}
                    mockData={mockData}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={onSelectNode}
                    surface={surface}
                    onDropPayload={onDropPayload}
                    isDragging={isDragging}
                    isRoot={false}
                    parentType={node.type}
                  />
                ))}
                {activeDrag && (
                  <div
                    {...appendZoneProps}
                    className="border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 rounded py-2 text-center text-xs text-blue-600 font-medium transition-colors"
                  >
                    + Append to Widget
                  </div>
                )}
              </>
            )}
          </div>
        );
      }
    }
  };

  if (isRoot) {
    return (
      <div
        id={`hxl-wrapper-${node.id}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full ${
          dropPosition === 'inside' ? 'ring-2 ring-emerald-500 rounded-lg p-0.5' : ''
        }`}
      >
        {renderContent()}

        {/* Drop zone indicator when dragging inside root */}
        {dropPosition === 'inside' && (
          <div className="mt-3 border-2 border-dashed border-emerald-500 bg-emerald-50/50 rounded-lg p-3 text-center text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1.5 pointer-events-none animate-in fade-in">
            <span>+ Drop to append to widget root</span>
          </div>
        )}
      </div>
    );
  }

  const isInlineOrAuto =
    node.type === 'tile/button' ||
    node.type === 'tile/badge' ||
    node.type === 'tile/icon' ||
    node.type === 'tile/avatar' ||
    node.type === 'tile/spinner' ||
    rawProps.width === 'auto' ||
    rawProps.width === 'half' ||
    rawProps.width === 'flex-1';

  const widthClass =
    rawProps.width === 'half'
      ? 'w-1/2'
      : rawProps.width === 'flex-1'
      ? 'flex-1'
      : rawProps.width === 'auto'
      ? 'w-auto'
      : isInlineOrAuto
      ? 'shrink-0'
      : 'w-full';

  const isHorizontalParent = parentType === 'tile/row';

  return (
    <div
      id={`hxl-wrapper-${node.id}`}
      {...dragDropProps}
      onClick={handleClick}
      className={`relative group/hxl-node select-none ${widthClass} ${
        !isRoot ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        isThisNodeDragging ? 'opacity-40 ring-2 ring-blue-500 ring-dashed rounded' : ''
      } ${
        dropPosition === 'inside'
          ? 'ring-2 ring-emerald-500 ring-offset-1 rounded-sm'
          : ''
      }`}
    >
      {/* Before drop indicator */}
      {dropPosition === 'before' && (
        isHorizontalParent ? (
          <div className="absolute -left-1.5 top-0 bottom-0 w-1 bg-[#0070d2] rounded-full z-40 pointer-events-none flex flex-col justify-between items-center shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070d2] -mt-1 border-2 border-white shadow-xs" />
            <div className="h-full w-0.5 bg-[#0070d2]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070d2] -mb-1 border-2 border-white shadow-xs" />
          </div>
        ) : (
          <div className="absolute -top-1.5 left-0 right-0 h-1 bg-[#0070d2] rounded-full z-40 pointer-events-none flex items-center shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070d2] -ml-1 border-2 border-white shadow-xs" />
            <div className="w-full h-0.5 bg-[#0070d2]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070d2] -mr-1 border-2 border-white shadow-xs" />
          </div>
        )
      )}

      {/* Floating Grip Handle */}
      {!isRoot && (
        <div
          draggable={true}
          onDragStart={(e) => {
            e.stopPropagation();
            handleDragStart(e);
          }}
          onDragEnd={(e) => {
            e.stopPropagation();
            handleDragEnd(e);
          }}
          title="Drag to reorder component"
          className={`absolute -top-3 left-2 z-40 ${
            isSelected || isThisNodeDragging ? 'flex' : 'hidden group-hover/hxl-node:flex'
          } bg-slate-900 text-white rounded px-1.5 py-0.5 text-3xs font-mono items-center gap-1 cursor-grab active:cursor-grabbing shadow-md border border-slate-700 hover:bg-[#0070d2] select-none transition-colors`}
        >
          <GripVertical className="w-3 h-3 text-slate-300" />
          <span className="font-semibold text-slate-200">
            {isThisNodeDragging ? 'Moving...' : node.type.replace('tile/', '')}
          </span>
        </div>
      )}

      {/* Inside drop badge indicator */}
      {dropPosition === 'inside' && (
        <div className="absolute top-1 right-1 z-40 pointer-events-none bg-emerald-600 text-white font-medium text-3xs px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
          <span>↳ Drop inside</span>
        </div>
      )}

      {renderContent()}

      {/* After drop indicator */}
      {dropPosition === 'after' && (
        isHorizontalParent ? (
          <div className="absolute -right-1.5 top-0 bottom-0 w-1 bg-[#0070d2] rounded-full z-40 pointer-events-none flex flex-col justify-between items-center shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070d2] -mt-1 border-2 border-white shadow-xs" />
            <div className="h-full w-0.5 bg-[#0070d2]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070d2] -mb-1 border-2 border-white shadow-xs" />
          </div>
        ) : (
          <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-[#0070d2] rounded-full z-40 pointer-events-none flex items-center shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070d2] -ml-1 border-2 border-white shadow-xs" />
            <div className="w-full h-0.5 bg-[#0070d2]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070d2] -mr-1 border-2 border-white shadow-xs" />
          </div>
        )
      )}
    </div>
  );
};
