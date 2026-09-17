import React, { useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  Box,
  Columns3,
  ExternalLink,
  FileText,
  GripVertical,
  HelpCircle,
  Info,
  Layers,
  List,
  Loader2,
  Maximize2,
  Minus,
  MousePointerClick,
  Plus,
  Rows3,
  Search,
  Sparkles,
  Table2,
  Tag,
  Type,
  User,
} from 'lucide-react';
import { HXL_COMPONENTS } from '../data/hxlComponentCatalog';
import { HXLComponentDoc } from '../types/hxl';
import { setGlobalDragState, serializeHxlDrag } from '../utils/dragManager';

interface ComponentPaletteProps {
  onSelectComponentToAdd: (componentType: string) => void;
  onOpenDocModal: (componentType: string) => void;
}

const CATEGORIES = [
  'All',
  'Layout',
  'Typography',
  'Actions & Navigation',
  'Media & Data',
  'Feedback & Utility',
] as const;

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onSelectComponentToAdd,
  onOpenDocModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filteredComponents = HXL_COMPONENTS.filter((comp) => {
    const matchesSearch =
      comp.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === 'All' || comp.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getComponentIcon = (iconName: string) => {
    switch (iconName) {
      case 'Box': return <Box className="w-4 h-4 text-blue-600" />;
      case 'Columns3': return <Columns3 className="w-4 h-4 text-indigo-600" />;
      case 'Rows3': return <Rows3 className="w-4 h-4 text-purple-600" />;
      case 'Minus': return <Minus className="w-4 h-4 text-slate-500" />;
      case 'Maximize2': return <Maximize2 className="w-4 h-4 text-slate-500" />;
      case 'Type': return <Type className="w-4 h-4 text-emerald-600" />;
      case 'FileText': return <FileText className="w-4 h-4 text-teal-600" />;
      case 'MousePointerClick': return <MousePointerClick className="w-4 h-4 text-amber-600" />;
      case 'Tag': return <Tag className="w-4 h-4 text-orange-600" />;
      case 'AlertCircle': return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'User': return <User className="w-4 h-4 text-cyan-600" />;
      case 'Table2': return <Table2 className="w-4 h-4 text-sky-600" />;
      case 'List': return <List className="w-4 h-4 text-emerald-600" />;
      case 'Layers': return <Layers className="w-4 h-4 text-violet-600" />;
      case 'BarChart2': return <BarChart2 className="w-4 h-4 text-blue-600" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'Loader2': return <Loader2 className="w-4 h-4 text-slate-600" />;
      default: return <Box className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleDragStart = (e: React.DragEvent, comp: HXLComponentDoc) => {
    const payload = {
      sourceType: 'palette' as const,
      componentType: comp.type,
    };
    setGlobalDragState(payload);
    const serialized = serializeHxlDrag(payload);
    try {
      e.dataTransfer.setData('application/hxl-component', comp.type);
    } catch {}
    e.dataTransfer.setData('text/plain', serialized);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setGlobalDragState(null);
  };

  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full shrink-0 select-none">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-200 space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search HXL components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-2xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-[#0070d2] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Component Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="flex items-center justify-between text-2xs text-slate-500 uppercase tracking-wider font-semibold px-1">
          <span>Component Library ({filteredComponents.length})</span>
          <span className="text-3xs text-slate-400 font-normal">Drag or click +</span>
        </div>

        {filteredComponents.map((comp) => (
          <div
            key={comp.type}
            draggable
            onDragStart={(e) => handleDragStart(e, comp)}
            onDragEnd={handleDragEnd}
            className="group relative bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs rounded-lg p-2.5 transition-all cursor-grab active:cursor-grabbing flex items-start justify-between gap-2"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="p-1.5 rounded-md bg-slate-50 group-hover:bg-blue-50/60 border border-slate-100 transition-colors shrink-0">
                {getComponentIcon(comp.icon)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    {comp.displayName}
                  </span>
                  <span className="text-3xs font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                    {comp.type.replace('tile/', '')}
                  </span>
                </div>
                <p className="text-2xs text-slate-500 line-clamp-2 leading-relaxed mt-0.5">
                  {comp.description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <button
                type="button"
                title="View documentation"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDocModal(comp.type);
                }}
                className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                title="Add to canvas"
                onClick={() => onSelectComponentToAdd(comp.type)}
                className="p-1 bg-slate-100 hover:bg-[#0070d2] text-slate-700 hover:text-white rounded transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filteredComponents.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            No components match your search.
          </div>
        )}
      </div>

    </div>
  );
};
