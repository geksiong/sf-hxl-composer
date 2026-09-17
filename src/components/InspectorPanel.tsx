import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Database,
  Edit3,
  ExternalLink,
  Info,
  Layers,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { HXLComponentDoc, HXLNode, HXLSchema, HXLSchemaAttribute } from '../types/hxl';
import { HXL_COMPONENTS } from '../data/hxlComponentCatalog';
import { scanForAttributes } from '../utils/hxlUtils';

interface InspectorPanelProps {
  selectedNode: HXLNode | null;
  rootNode: HXLNode;
  schema: HXLSchema;
  mockData: Record<string, any>;
  onUpdateProperty: (propName: string, value: any) => void;
  onUpdateMockData: (key: string, value: any) => void;
  onAddSchemaAttribute: (
    key: string,
    attr: HXLSchemaAttribute,
    mockValue: any,
    isRequired?: boolean,
  ) => void;
  onUpdateSchemaAttribute: (
    key: string,
    updatedFields: Partial<HXLSchemaAttribute>,
    isRequired?: boolean,
  ) => void;
  onDeleteSchemaAttribute: (key: string) => void;
  onOpenDocModal: (componentType: string) => void;
  onMoveNode?: (id: string, direction: 'up' | 'down') => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  rootNode,
  schema,
  mockData,
  onUpdateProperty,
  onUpdateMockData,
  onAddSchemaAttribute,
  onUpdateSchemaAttribute,
  onDeleteSchemaAttribute,
  onOpenDocModal,
  onMoveNode,
}) => {
  const [activeTab, setActiveTab] = useState<'props' | 'docs' | 'schema'>('props');

  // New attribute form state
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrTitle, setNewAttrTitle] = useState('');
  const [newAttrDescription, setNewAttrDescription] = useState('');
  const [newAttrType, setNewAttrType] = useState<HXLSchemaAttribute['type']>('string');
  const [newAttrDefault, setNewAttrDefault] = useState('');
  const [newAttrRequired, setNewAttrRequired] = useState(false);
  const [showAddAttrForm, setShowAddAttrForm] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const doc: HXLComponentDoc | undefined = selectedNode
    ? HXL_COMPONENTS.find((c) => c.type === selectedNode.type)
    : undefined;

  const schemaAttributes = schema.properties.attributes.properties || {};
  const schemaKeys = Object.keys(schemaAttributes);
  const requiredKeys = schema.properties.attributes.required || [];
  const referencedKeys = scanForAttributes(rootNode);

  const handleAddAttributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrKey.trim()) return;

    const key = newAttrKey.trim().replace(/[^a-zA-Z0-9_]/g, '');
    let val: any = newAttrDefault;
    if (newAttrType === 'number') val = Number(newAttrDefault) || 0;
    if (newAttrType === 'boolean') val = newAttrDefault === 'true';

    onAddSchemaAttribute(
      key,
      {
        type: newAttrType,
        title: newAttrTitle.trim() || key,
        description:
          newAttrDescription.trim() || `Attribute bound to {!$attrs.${key}}`,
        default: val,
      },
      val,
      newAttrRequired,
    );

    setNewAttrKey('');
    setNewAttrTitle('');
    setNewAttrDescription('');
    setNewAttrDefault('');
    setNewAttrType('string');
    setNewAttrRequired(false);
    setShowAddAttrForm(false);
  };

  const handleInsertTokenIntoProp = (propName: string, attrKey: string) => {
    const currentVal = String(selectedNode?.properties?.[propName] || '');
    const token = `{!$attrs.${attrKey}}`;
    const updated = currentVal ? `${currentVal} ${token}` : token;
    onUpdateProperty(propName, updated);
  };

  return (
    <div className="w-88 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 select-none">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('props')}
          className={`flex-1 py-2.5 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'props'
              ? 'border-[#0070d2] text-[#0070d2] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Properties</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-2.5 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'docs'
              ? 'border-[#0070d2] text-[#0070d2] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Docs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`flex-1 py-2.5 px-3 font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'schema'
              ? 'border-[#0070d2] text-[#0070d2] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="flex items-center gap-1">
            Schema
            {schemaKeys.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-3xs px-1 rounded-full">
                {schemaKeys.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Tab 1: Properties Inspector */}
      {activeTab === 'props' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {selectedNode ? (
            <>
              {/* Component Info Header */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {doc?.displayName || selectedNode.type}
                    </span>
                    <span className="font-mono text-3xs bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-semibold">
                      {selectedNode.type}
                    </span>
                  </div>
                  <p className="text-3xs text-slate-500 mt-0.5 font-mono">
                    ID: {selectedNode.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDocModal(selectedNode.type)}
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-blue-600 transition-colors"
                  title="View full documentation"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>

              {/* Position & Order Quick Controls */}
              {onMoveNode && selectedNode.id !== rootNode.id && (
                <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 rounded-lg p-2.5">
                  <div className="flex flex-col">
                    <span className="text-2xs font-bold text-blue-950 flex items-center gap-1">
                      ↕ Order in Layout
                    </span>
                    <span className="text-3xs text-blue-700">Move before or after siblings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onMoveNode(selectedNode.id, 'up')}
                      className="px-2.5 py-1 text-xs bg-white border border-blue-300 hover:bg-blue-100 rounded text-blue-900 font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title="Move up / before sibling"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveNode(selectedNode.id, 'down')}
                      className="px-2.5 py-1 text-xs bg-white border border-blue-300 hover:bg-blue-100 rounded text-blue-900 font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title="Move down / after sibling"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Down</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Property Form Fields */}
              <div className="space-y-4">
                <div className="text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center justify-between">
                  <span>Configuration</span>
                  <span className="text-3xs text-slate-400 font-normal">
                    {doc?.officialProps.length || 0} attributes
                  </span>
                </div>

                {doc?.officialProps.map((propSpec) => {
                  const currentValue = selectedNode.properties?.[propSpec.name] ?? propSpec.default ?? '';

                  return (
                    <div key={propSpec.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-slate-700 flex items-center gap-1">
                          <span>{propSpec.label}</span>
                          {propSpec.lightningType && (
                            <span
                              title={`Lightning Type: ${propSpec.lightningType}`}
                              className="text-3xs font-mono text-blue-600 bg-blue-50 px-1 rounded"
                            >
                              ⚡
                            </span>
                          )}
                        </label>

                        {/* Attribute Token Inserter Helper for String & Expression Fields */}
                        {(propSpec.type === 'expression' || propSpec.type === 'string') &&
                          schemaKeys.length > 0 && (
                            <div className="relative group">
                              <button
                                type="button"
                                className="text-3xs text-[#0070d2] font-mono hover:underline flex items-center gap-0.5"
                              >
                                <span>+ Bind {'{!$attrs}'}</span>
                              </button>
                              <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-md p-1 z-30 max-h-48 overflow-y-auto">
                                <div className="text-3xs text-slate-400 font-semibold px-2 py-1 uppercase">
                                  Bind Schema Attribute:
                                </div>
                                {schemaKeys.map((k) => (
                                  <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleInsertTokenIntoProp(propSpec.name, k)}
                                    className="w-full text-left px-2 py-1 text-xs hover:bg-blue-50 text-slate-700 rounded font-mono truncate"
                                  >
                                    {`{!$attrs.${k}}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Field Inputs by Type */}
                      {propSpec.type === 'select' && (
                        <select
                          value={currentValue}
                          onChange={(e) => onUpdateProperty(propSpec.name, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        >
                          {propSpec.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {propSpec.type === 'boolean' && (
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(currentValue)}
                            onChange={(e) => onUpdateProperty(propSpec.name, e.target.checked)}
                            className="w-4 h-4 text-[#0070d2] rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-600">
                            {propSpec.description || 'Enable'}
                          </span>
                        </label>
                      )}

                      {propSpec.type === 'expression' && (
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => onUpdateProperty(propSpec.name, e.target.value)}
                          placeholder="e.g. {!$attrs.field} or static text"
                          className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        />
                      )}

                      {propSpec.type === 'string' && (
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => onUpdateProperty(propSpec.name, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        />
                      )}

                      {propSpec.type === 'number' && (
                        <input
                          type="number"
                          value={currentValue}
                          onChange={(e) => onUpdateProperty(propSpec.name, Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        />
                      )}

                      {propSpec.type === 'json' && (
                        <textarea
                          rows={4}
                          value={
                            typeof currentValue === 'object'
                              ? JSON.stringify(currentValue, null, 2)
                              : currentValue
                          }
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              onUpdateProperty(propSpec.name, parsed);
                            } catch {
                              onUpdateProperty(propSpec.name, e.target.value);
                            }
                          }}
                          className="w-full p-2 text-2xs font-mono bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        />
                      )}

                      <p className="text-3xs text-slate-400">{propSpec.description}</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-700">No Component Selected</h3>
              <p className="text-2xs text-slate-500 mt-1 leading-relaxed">
                Click any component in the visual canvas or outline tree to configure its
                properties, token bindings, and styling.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Documentation */}
      {activeTab === 'docs' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {doc ? (
            <>
              <div className="border-b border-slate-200 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{doc.displayName}</span>
                  <span className="font-mono text-2xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                    {doc.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {doc.description}
                </p>
              </div>

              {/* Usage Notes */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                <div className="font-bold flex items-center gap-1 mb-1 text-[#0070d2]">
                  <Info className="w-3.5 h-3.5" />
                  <span>HXL Specification Guidelines</span>
                </div>
                <p className="text-2xs leading-relaxed text-blue-800">{doc.usageNotes}</p>
              </div>

              {/* Allowed Properties Table */}
              <div className="space-y-2">
                <div className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                  Supported Properties
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-2xs">
                  {doc.officialProps.map((p) => (
                    <div key={p.name} className="p-2.5 bg-white space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-slate-800">{p.name}</span>
                        <span className="text-slate-400 text-3xs">
                          {p.lightningType || p.type}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-snug">{p.description}</p>
                      {p.options && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.options.map((opt) => (
                            <span
                              key={opt.value}
                              className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono text-3xs"
                            >
                              {opt.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Example JSON */}
              <div className="space-y-1.5">
                <div className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                  Example Component JSON
                </div>
                <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-2xs font-mono overflow-x-auto">
                  {JSON.stringify(doc.exampleJson, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-xs text-slate-400">
              Select a component to inspect its official documentation.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Schema & Mock Data Inspector */}
      {activeTab === 'schema' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Widget Schema Contract</h3>
              <p className="text-3xs text-slate-500">
                Edit schema.json descriptions, types & mock test values
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddAttrForm(!showAddAttrForm)}
              className="px-2.5 py-1 bg-[#0070d2] text-white hover:bg-blue-700 rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Attribute</span>
            </button>
          </div>

          {/* Add Attribute Drawer */}
          {showAddAttrForm && (
            <form
              onSubmit={handleAddAttributeSubmit}
              className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#0070d2]" />
                  <span>New Schema Attribute</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAttrForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="text-2xs text-slate-700 font-semibold block mb-0.5">
                  Attribute Key <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-2xs text-slate-400">
                    $attrs.
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="orderStatus, priority, etc."
                    value={newAttrKey}
                    onChange={(e) => setNewAttrKey(e.target.value)}
                    className="w-full pl-13 pr-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-2xs text-slate-700 font-semibold block mb-0.5">
                  Display Title / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Order Status, Priority Level"
                  value={newAttrTitle}
                  onChange={(e) => setNewAttrTitle(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-2xs text-slate-700 font-semibold block mb-0.5">
                  Description (Salesforce DX contract)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Current fulfillment stage from Order Management System"
                  value={newAttrDescription}
                  onChange={(e) => setNewAttrDescription(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs text-slate-700 font-semibold block mb-0.5">
                    Data Type
                  </label>
                  <select
                    value={newAttrType}
                    onChange={(e) => setNewAttrType(e.target.value as any)}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="object">Object (JSON)</option>
                    <option value="array">Array (JSON)</option>
                  </select>
                </div>
                <div>
                  <label className="text-2xs text-slate-700 font-semibold block mb-0.5">
                    Default Mock Value
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. In Progress, 42"
                    value={newAttrDefault}
                    onChange={(e) => setNewAttrDefault(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newAttrRequired}
                  onChange={(e) => setNewAttrRequired(e.target.checked)}
                  className="w-3.5 h-3.5 text-[#0070d2] rounded"
                />
                <span className="text-2xs text-slate-700 font-medium">
                  Mark as Required in schema.json contract
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-1 border-t border-blue-200">
                <button
                  type="button"
                  onClick={() => setShowAddAttrForm(false)}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#0070d2] text-white rounded text-xs font-semibold hover:bg-blue-600 shadow-xs"
                >
                  Create & Seed Mock Data
                </button>
              </div>
            </form>
          )}

          {/* List of Schema Attributes with In-Place Description & Mock Value Editing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-2xs font-bold uppercase tracking-wider text-slate-500">
              <span>Attributes & Schema Contract ({schemaKeys.length})</span>
              <span className="text-3xs font-normal text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live in schema.json
              </span>
            </div>

            {schemaKeys.map((key) => {
              const attr = schemaAttributes[key] || {};
              const isRequired = requiredKeys.includes(key);
              const mockVal = mockData[key] !== undefined ? mockData[key] : attr.default;
              const isReferencedInWidget = referencedKeys.includes(key);
              const isExpanded = expandedKeys[key] ?? true;

              return (
                <div
                  key={key}
                  className="p-3 bg-white border border-slate-200 rounded-lg space-y-2.5 hover:border-slate-300 transition-colors shadow-2xs"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(key)}
                        className="text-slate-400 hover:text-slate-600"
                        title={isExpanded ? 'Collapse fields' : 'Expand fields'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="font-mono text-xs font-bold text-blue-700 truncate">
                        {`{!$attrs.${key}}`}
                      </span>
                      <span className="text-3xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                        {attr.type}
                      </span>
                      {isRequired && (
                        <span className="text-3xs bg-amber-50 text-amber-700 font-semibold px-1 rounded border border-amber-200">
                          REQ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Delete attribute from schema"
                        onClick={() => onDeleteSchemaAttribute(key)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Collapsible / Editable Schema Details */}
                  {isExpanded && (
                    <div className="space-y-2.5 pt-1 border-t border-slate-100">
                      {/* Title input */}
                      <div>
                        <label className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">
                          Display Title (Master Label)
                        </label>
                        <input
                          type="text"
                          value={attr.title || ''}
                          onChange={(e) =>
                            onUpdateSchemaAttribute(key, { title: e.target.value })
                          }
                          placeholder="e.g. Case Subject"
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>

                      {/* Description Textarea (User requested ability to edit descriptions!) */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-3xs uppercase font-bold text-slate-500 block">
                            Description (schema.json contract)
                          </label>
                          <span className="text-3xs text-blue-600 font-medium">Editable</span>
                        </div>
                        <textarea
                          rows={2}
                          value={attr.description || ''}
                          onChange={(e) =>
                            onUpdateSchemaAttribute(key, { description: e.target.value })
                          }
                          placeholder="Provide a clear description for Salesforce Agentforce or Studio documentation..."
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-700 leading-relaxed"
                        />
                      </div>

                      {/* Data Type & Required Toggle */}
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div>
                          <label className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">
                            Data Type
                          </label>
                          <select
                            value={attr.type || 'string'}
                            onChange={(e) =>
                              onUpdateSchemaAttribute(key, {
                                type: e.target.value as any,
                              })
                            }
                            className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white text-slate-700"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="object">Object</option>
                            <option value="array">Array</option>
                          </select>
                        </div>
                        <div className="pt-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isRequired}
                              onChange={(e) =>
                                onUpdateSchemaAttribute(key, {}, e.target.checked)
                              }
                              className="w-3.5 h-3.5 text-[#0070d2] rounded"
                            />
                            <span className="text-2xs text-slate-700 font-medium">
                              Required
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Mock Value Real-time Editor */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-3xs uppercase font-bold text-slate-500 block">
                            Mock Value (Live Preview)
                          </label>
                          <span className="text-3xs text-slate-400">Affects canvas</span>
                        </div>
                        {attr.type === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-1.5 rounded border border-slate-200">
                            <input
                              type="checkbox"
                              checked={Boolean(mockVal)}
                              onChange={(e) => onUpdateMockData(key, e.target.checked)}
                              className="w-3.5 h-3.5 text-[#0070d2] rounded"
                            />
                            <span className="text-xs text-slate-700 font-medium">
                              {mockVal ? 'True (Boolean enabled)' : 'False (Boolean disabled)'}
                            </span>
                          </label>
                        ) : attr.type === 'number' ? (
                          <input
                            type="number"
                            value={mockVal ?? 0}
                            onChange={(e) => onUpdateMockData(key, Number(e.target.value))}
                            className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                        ) : (
                          <input
                            type="text"
                            value={mockVal ?? ''}
                            onChange={(e) => onUpdateMockData(key, e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {!isReferencedInWidget && (
                    <div className="text-3xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                      <span>⚠️ Not currently referenced in any component expression</span>
                    </div>
                  )}
                </div>
              );
            })}

            {schemaKeys.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4">
                No schema attributes defined yet. Type {'{!$attrs.myField}'} into any component or
                click "+ Add Attribute" above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
