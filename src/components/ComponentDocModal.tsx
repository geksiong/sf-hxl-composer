import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Code,
  Copy,
  ExternalLink,
  Info,
  Layers,
  Search,
  X,
} from 'lucide-react';
import { HXL_COMPONENTS } from '../data/hxlComponentCatalog';
import { HXLComponentDoc } from '../types/hxl';

interface ComponentDocModalProps {
  initialComponentType?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectComponentToAdd?: (type: string) => void;
}

export const ComponentDocModal: React.FC<ComponentDocModalProps> = ({
  initialComponentType,
  isOpen,
  onClose,
  onSelectComponentToAdd,
}) => {
  if (!isOpen) return null;

  const [selectedType, setSelectedType] = useState<string>(
    initialComponentType || 'tile/container',
  );
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredComponents = HXL_COMPONENTS.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()),
  );

  const activeDoc: HXLComponentDoc =
    HXL_COMPONENTS.find((c) => c.type === selectedType) || HXL_COMPONENTS[0];

  const handleCopyExample = () => {
    navigator.clipboard.writeText(JSON.stringify(activeDoc.exampleJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0070d2] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Salesforce HXL Component Reference
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Component Picker */}
          <div className="w-72 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter 22 components..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredComponents.map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => setSelectedType(c.type)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    selectedType === c.type
                      ? 'bg-[#0070d2] text-white font-semibold shadow-xs'
                      : 'hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div>{c.displayName}</div>
                    <div
                      className={`text-3xs font-mono truncate ${
                        selectedType === c.type ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {c.type}
                    </div>
                  </div>
                  <span
                    className={`text-3xs px-1.5 py-0.5 rounded-full ${
                      selectedType === c.type
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {c.category}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Specification Details */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{activeDoc.displayName}</h1>
                  <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                    {activeDoc.type}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {activeDoc.description}
                </p>
              </div>

              {onSelectComponentToAdd && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectComponentToAdd(activeDoc.type);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-[#0070d2] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  + Add to Canvas
                </button>
              )}
            </div>

            {/* Architecture Guidelines */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800 text-sm">
                <Info className="w-4 h-4" />
                <span>Overview</span>
              </div>
              <p className="leading-relaxed">{activeDoc.usageNotes}</p>
            </div>

            {/* Properties Specification Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Component Properties & Types
              </h3>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-3">Property</th>
                      <th className="p-3">Lightning / Schema Type</th>
                      <th className="p-3">Default</th>
                      <th className="p-3">Description & Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDoc.officialProps.map((p) => (
                      <tr key={p.name} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-900">{p.name}</td>
                        <td className="p-3 font-mono text-blue-700 text-2xs">
                          {p.lightningType || p.type}
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-2xs">
                          {p.default !== undefined ? String(p.default) : '—'}
                        </td>
                        <td className="p-3 text-slate-700">
                          <div>{p.description}</div>
                          {p.options && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {p.options.map((opt) => (
                                <span
                                  key={opt.value}
                                  className="bg-slate-100 text-slate-600 text-3xs font-mono px-1.5 py-0.5 rounded"
                                >
                                  {opt.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Canonical HXL JSON Example */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Canonical HXL Composition Snippet
                </h3>
                <button
                  type="button"
                  onClick={handleCopyExample}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-2xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
                {JSON.stringify(activeDoc.exampleJson, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
