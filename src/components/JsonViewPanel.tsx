import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowDown,
  Check,
  Code2,
  Copy,
  Download,
  FileCode,
  FileJson,
  Layers,
  LocateFixed,
} from 'lucide-react';
import { HXLWidgetBundle } from '../types/hxl';
import {
  downloadTextFile,
  downloadUiWidgetBundleZip,
  generateMetaXml,
  JsonLineInfo,
  serializeHxlComposition,
} from '../utils/hxlUtils';

interface JsonViewPanelProps {
  bundle: HXLWidgetBundle;
  selectedNodeId?: string | null;
  onSelectNode?: (id: string | null) => void;
  onImportJson?: (importedBundle: Partial<HXLWidgetBundle>) => void;
}

// Tokenizes a JSON string into syntax-colored React spans
function highlightTokens(code: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const regex =
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"\s*:?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}\[\],:])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <span key={`ws-${lastIndex}`} className="text-slate-300">
          {code.slice(lastIndex, match.index)}
        </span>,
      );
    }

    const token = match[0];
    const key = `token-${match.index}`;

    if (token.endsWith(':')) {
      const colonIdx = token.lastIndexOf(':');
      const keyPart = token.slice(0, colonIdx);
      const colonPart = token.slice(colonIdx);
      elements.push(
        <span key={key} className="text-sky-300 font-medium">
          {keyPart}
        </span>,
      );
      elements.push(
        <span key={`${key}-colon`} className="text-slate-400">
          {colonPart}
        </span>,
      );
    } else if (token.startsWith('"')) {
      if (token.includes('{!')) {
        elements.push(
          <span
            key={key}
            className="text-cyan-300 font-semibold bg-cyan-950/60 px-1 py-0.5 rounded border border-cyan-700/50"
            title="Salesforce Expression Binding"
          >
            {token}
          </span>,
        );
      } else {
        elements.push(
          <span key={key} className="text-amber-200">
            {token}
          </span>,
        );
      }
    } else if (token === 'true' || token === 'false') {
      elements.push(
        <span key={key} className="text-blue-400 font-semibold">
          {token}
        </span>,
      );
    } else if (token === 'null') {
      elements.push(
        <span key={key} className="text-rose-400 font-semibold">
          {token}
        </span>,
      );
    } else if (!isNaN(Number(token))) {
      elements.push(
        <span key={key} className="text-emerald-300 font-mono">
          {token}
        </span>,
      );
    } else {
      elements.push(
        <span key={key} className="text-slate-400">
          {token}
        </span>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    elements.push(
      <span key={`ws-end-${lastIndex}`} className="text-slate-300">
        {code.slice(lastIndex)}
      </span>,
    );
  }

  return elements;
}

// Tokenizes XML for the metadata XML tab
function highlightXmlTokens(code: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const regex = /(<\/?[a-zA-Z0-9_\-]+|\/?>|[a-zA-Z0-9_\-]+="[^"]*"|<!--.*?-->)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`} className="text-slate-200">
          {code.slice(lastIndex, match.index)}
        </span>,
      );
    }
    const token = match[0];
    const key = `xml-${match.index}`;

    if (token.startsWith('<!--')) {
      elements.push(
        <span key={key} className="text-slate-500 italic">
          {token}
        </span>,
      );
    } else if (token.startsWith('</') || token.startsWith('<')) {
      elements.push(
        <span key={key} className="text-sky-400 font-semibold">
          {token}
        </span>,
      );
    } else if (token === '>' || token === '/>') {
      elements.push(
        <span key={key} className="text-sky-400 font-semibold">
          {token}
        </span>,
      );
    } else if (token.includes('=')) {
      const eqIdx = token.indexOf('=');
      const attrName = token.slice(0, eqIdx);
      const attrVal = token.slice(eqIdx + 1);
      elements.push(
        <span key={key}>
          <span className="text-purple-300">{attrName}</span>
          <span className="text-slate-400">=</span>
          <span className="text-amber-200">{attrVal}</span>
        </span>,
      );
    } else {
      elements.push(<span key={key}>{token}</span>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < code.length) {
    elements.push(
      <span key={`end-${lastIndex}`} className="text-slate-200">
        {code.slice(lastIndex)}
      </span>,
    );
  }
  return elements;
}

export const JsonViewPanel: React.FC<JsonViewPanelProps> = ({
  bundle,
  selectedNodeId,
  onSelectNode,
}) => {
  const [activeFileTab, setActiveFileTab] = useState<'composition' | 'schema' | 'meta' | 'mock'>(
    'composition',
  );
  const [copied, setCopied] = useState(false);

  const codeContainerRef = useRef<HTMLDivElement | null>(null);
  const lineElementsRef = useRef<Record<number, HTMLDivElement | null>>({});

  const folderName = bundle.name || 'myHxlWidget';

  // Serialize composition with line-level AST mappings
  const compositionData = useMemo(() => {
    return serializeHxlComposition(bundle.root);
  }, [bundle.root]);

  const schemaJsonStr = useMemo(() => JSON.stringify(bundle.schema, null, 2), [bundle.schema]);
  const metaXmlStr = useMemo(() => generateMetaXml(bundle), [bundle]);
  const mockJsonStr = useMemo(() => JSON.stringify(bundle.mockData, null, 2), [bundle.mockData]);

  // Selected component line range
  const selectedRange = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return compositionData.nodeRanges[selectedNodeId];
  }, [selectedNodeId, compositionData.nodeRanges]);

  // Smoothly scroll to a specific line in the code viewer
  const scrollToLine = (lineNum: number, smooth: boolean = true) => {
    const lineEl = lineElementsRef.current[lineNum];
    const container = codeContainerRef.current;
    if (!lineEl || !container) return;

    const targetTop = lineEl.offsetTop;
    const containerHeight = container.clientHeight;
    // Position start of block roughly 25% down from top
    const scrollToY = Math.max(0, targetTop - Math.floor(containerHeight * 0.25));

    container.scrollTo({
      top: scrollToY,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // When selectedNodeId changes, auto-switch to composition file tab and scroll to block
  const prevSelectedIdRef = useRef<string | null | undefined>(selectedNodeId);
  useEffect(() => {
    if (!selectedNodeId) {
      prevSelectedIdRef.current = selectedNodeId;
      return;
    }

    // If focused on a component while looking at another tab, switch to composition tab
    if (activeFileTab !== 'composition') {
      setActiveFileTab('composition');
    }

    const range = compositionData.nodeRanges[selectedNodeId];
    if (range) {
      const timer = setTimeout(() => {
        scrollToLine(range.startLine, true);
      }, 50);
      return () => clearTimeout(timer);
    }
    prevSelectedIdRef.current = selectedNodeId;
  }, [selectedNodeId, activeFileTab, compositionData]);

  const getCurrentFileContent = () => {
    switch (activeFileTab) {
      case 'composition':
        return {
          filename: `${folderName}.json`,
          content: compositionData.fullJsonText,
          mime: 'application/json',
        };
      case 'schema':
        return { filename: 'schema.json', content: schemaJsonStr, mime: 'application/json' };
      case 'meta':
        return {
          filename: `${folderName}.uiwidget-meta.xml`,
          content: metaXmlStr,
          mime: 'application/xml',
        };
      case 'mock':
        return { filename: 'mockData.json', content: mockJsonStr, mime: 'application/json' };
    }
  };

  const currentFile = getCurrentFileContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCurrent = () => {
    downloadTextFile(currentFile.filename, currentFile.content, currentFile.mime);
  };

  const handleDownloadZip = async () => {
    await downloadUiWidgetBundleZip(bundle);
  };

  const otherTabLines = useMemo(() => {
    return currentFile.content.split('\n');
  }, [currentFile.content]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none">
      {/* File Tab Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveFileTab('composition')}
            className={`px-3 py-1.5 rounded-md font-mono text-2xs flex items-center gap-1.5 transition-colors ${
              activeFileTab === 'composition'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>{folderName}.json</span>
            {selectedRange && (
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" title="Active selection" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFileTab('schema')}
            className={`px-3 py-1.5 rounded-md font-mono text-2xs flex items-center gap-1.5 transition-colors ${
              activeFileTab === 'schema'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>schema.json</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFileTab('meta')}
            className={`px-3 py-1.5 rounded-md font-mono text-2xs flex items-center gap-1.5 transition-colors ${
              activeFileTab === 'meta'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>.uiwidget-meta.xml</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFileTab('mock')}
            className={`px-3 py-1.5 rounded-md font-mono text-2xs flex items-center gap-1.5 transition-colors ${
              activeFileTab === 'mock'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>mockData.json</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadCurrent}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            className="px-3 py-1 bg-[#0070d2] hover:bg-blue-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Export DX Bundle (ZIP)</span>
          </button>
        </div>
      </div>

      {/* Component Navigation Banner when a component is focused */}
      {activeFileTab === 'composition' && selectedRange && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-950/90 border-b border-blue-800/70 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <LocateFixed className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span className="text-slate-300 text-xs font-medium">Focused in Widget:</span>
            <span className="font-mono text-xs font-bold text-white bg-[#0070d2] px-2 py-0.5 rounded shadow-xs">
              {selectedRange.type}
            </span>
            <span className="text-2xs font-mono text-blue-200 bg-blue-900/80 px-2 py-0.5 rounded border border-blue-700">
              Lines {selectedRange.startLine}–{selectedRange.endLine}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollToLine(selectedRange.startLine, true)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-2xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Navigate directly to focused block"
            >
              <ArrowDown className="w-3 h-3" />
              <span>Jump to JSON Block</span>
            </button>
          </div>
        </div>
      )}

      {/* Code Viewer Container */}
      <div
        ref={codeContainerRef}
        className="flex-1 overflow-auto py-3 font-mono text-xs leading-relaxed text-slate-200 bg-slate-900 select-text"
      >
        {activeFileTab === 'composition' ? (
          <div>
            {compositionData.lines.map((line: JsonLineInfo) => {
              const isHighlighted = Boolean(
                selectedRange &&
                  line.lineNumber >= selectedRange.startLine &&
                  line.lineNumber <= selectedRange.endLine,
              );
              const isStartLine = Boolean(
                selectedRange && line.lineNumber === selectedRange.startLine,
              );
              const isEndLine = Boolean(
                selectedRange && line.lineNumber === selectedRange.endLine,
              );

              return (
                <div
                  key={line.lineNumber}
                  ref={(el) => {
                    lineElementsRef.current[line.lineNumber] = el;
                  }}
                  id={`json-line-${line.lineNumber}`}
                  onClick={() => {
                    if (line.nodeId && onSelectNode) {
                      onSelectNode(line.nodeId);
                    }
                  }}
                  className={`group flex items-center font-mono text-xs leading-6 px-3 cursor-pointer transition-colors duration-150 ${
                    isHighlighted
                      ? 'bg-blue-900/35 border-l-[3px] border-[#0070d2] text-slate-100'
                      : 'border-l-[3px] border-transparent hover:bg-slate-800/60 text-slate-300'
                  } ${isStartLine ? 'pt-0.5' : ''} ${isEndLine ? 'pb-0.5' : ''}`}
                >
                  {/* Line Number Gutter */}
                  <span
                    className={`w-9 shrink-0 pr-3 text-right select-none font-mono text-2xs transition-colors ${
                      isHighlighted
                        ? 'text-blue-300 font-bold'
                        : 'text-slate-600 group-hover:text-slate-400'
                    }`}
                  >
                    {line.lineNumber}
                  </span>

                  {/* Code Line with Token Highlighting */}
                  <div className="flex-1 overflow-x-auto whitespace-pre font-mono">
                    {highlightTokens(line.content)}
                  </div>

                  {/* Start of Block Badge */}
                  {isStartLine && selectedRange && (
                    <span className="ml-3 shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-sans font-bold uppercase tracking-wider bg-[#0070d2] text-white shadow-xs select-none">
                      <LocateFixed className="w-2.5 h-2.5" />
                      <span>{selectedRange.type}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {otherTabLines.map((lineText: string, idx: number) => {
              const lineNum = idx + 1;
              return (
                <div
                  key={lineNum}
                  className="flex items-center font-mono text-xs leading-6 px-3 hover:bg-slate-800/40 text-slate-300 border-l-[3px] border-transparent"
                >
                  <span className="w-9 shrink-0 pr-3 text-right select-none font-mono text-2xs text-slate-600">
                    {lineNum}
                  </span>
                  <div className="flex-1 overflow-x-auto whitespace-pre font-mono">
                    {activeFileTab === 'meta'
                      ? highlightXmlTokens(lineText)
                      : highlightTokens(lineText)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Path Helper Footer */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-3xs text-slate-400 flex items-center justify-between font-mono">
        <span className="truncate">
          Salesforce DX Path: force-app/main/default/uiWidgets/{folderName}/{currentFile.filename}
        </span>
      </div>
    </div>
  );
};
