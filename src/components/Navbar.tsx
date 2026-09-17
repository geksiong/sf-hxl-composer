import React, { useState } from 'react';
import {
  Archive,
  BookOpen,
  Check,
  Code,
  Copy,
  Download,
  Eye,
  FileCode,
  FolderOpen,
  HelpCircle,
  Laptop,
  Layout,
  MessageSquare,
  Redo,
  RefreshCw,
  Sliders,
  Sparkles,
  SplitSquareVertical,
  Undo,
} from 'lucide-react';
import { SurfaceType, ViewMode } from '../types/hxl';
import { SAMPLE_TEMPLATES } from '../data/sampleTemplates';

interface NavbarProps {
  widgetName: string;
  onChangeWidgetName: (newName: string) => void;
  surface: SurfaceType;
  onChangeSurface: (newSurface: SurfaceType) => void;
  viewMode: ViewMode;
  onChangeViewMode: (newMode: ViewMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSelectTemplate: (templateIndex: number) => void;
  onNewBlankWidget: () => void;
  onOpenDocModal: () => void;
  onExportZip: () => void;
  onCopyCompositionJson: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  widgetName,
  onChangeWidgetName,
  surface,
  onChangeSurface,
  viewMode,
  onChangeViewMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSelectTemplate,
  onNewBlankWidget,
  onOpenDocModal,
  onExportZip,
  onCopyCompositionJson,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const handleCopy = () => {
    onCopyCompositionJson();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Brand & Widget Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0070d2] text-white flex items-center justify-center shadow-xs font-bold text-base">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 tracking-tight">
                HXL WIDGET COMPOSER
              </span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Editable Widget Name */}
        <div className="flex items-center gap-1.5">
          <span className="text-2xs font-mono text-slate-400">uiWidgets/</span>
          <input
            type="text"
            value={widgetName}
            onChange={(e) => onChangeWidgetName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            title="Salesforce DX UiWidgetBundle developer name"
            className="text-xs font-mono font-bold text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-blue-500 px-1.5 py-0.5 rounded border border-transparent focus:border-slate-300 w-44"
          />
        </div>

        {/* Template Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Templates</span>
          </button>

          {showTemplateMenu && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 shadow-xl rounded-lg p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-3xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Sample HXL Widgets
              </div>

              {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => {
                    onSelectTemplate(idx);
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left p-2 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <div className="text-xs font-bold text-slate-800">{tmpl.masterLabel}</div>
                  <div className="text-2xs text-slate-500 truncate">{tmpl.description}</div>
                </button>
              ))}

              <div className="border-t border-slate-100 my-1" />

              <button
                type="button"
                onClick={() => {
                  onNewBlankWidget();
                  setShowTemplateMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-100 rounded-md text-xs font-medium text-slate-700 flex items-center gap-2"
              >
                <span>+ Blank Card Template</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle Controls: Surface Simulation & View Modes */}
      <div className="flex items-center gap-3">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Omnichannel Surface Switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => onChangeSurface('lightning')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              surface === 'lightning'
                ? 'bg-[#0070d2] text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⚡ Lightning</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeSurface('slack')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              surface === 'slack'
                ? 'bg-[#0070d2] text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💬 Slack</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeSurface('chat')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              surface === 'chat'
                ? 'bg-[#0070d2] text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agentforce</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeSurface('fluid')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              surface === 'fluid'
                ? 'bg-[#0070d2] text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Fluid</span>
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
          <button
            type="button"
            title="Visual Canvas Only"
            onClick={() => onChangeViewMode('canvas')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'canvas'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Canvas</span>
          </button>

          <button
            type="button"
            title="Split Visual & Code"
            onClick={() => onChangeViewMode('split')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'split'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Split</span>
          </button>

          <button
            type="button"
            title="JSON & Schema Code View"
            onClick={() => onChangeViewMode('json')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'json'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Docs & Export DX Bundle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenDocModal}
          className="px-2.5 py-1 text-xs text-slate-700 hover:text-[#0070d2] hover:bg-blue-50 rounded-md font-medium flex items-center gap-1.5 transition-colors border border-slate-200"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#0070d2]" />
          <span className="hidden md:inline">HXL Specs</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md font-medium flex items-center gap-1.5 transition-colors border border-slate-200"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Copy JSON</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onExportZip}
          className="px-3 py-1.5 bg-[#0070d2] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Export DX Bundle</span>
        </button>
      </div>
    </header>
  );
};
