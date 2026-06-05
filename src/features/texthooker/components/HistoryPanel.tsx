"use client";

import React, { useState, useMemo } from "react";
import { HookedSentence } from "../types";
import { 
  XIcon, SearchIcon, TrashIcon, CopyIcon, 
  CheckIcon, VolumeIcon, DownloadIcon 
} from "./Icons";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HookedSentence[];
  onDeleteLine: (id: string) => void;
  onEditLine: (id: string, text: string) => void;
  onClearHistory: () => void;
  onSpeak: (text: string) => void;
  showTimestamp: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  history,
  onDeleteLine,
  onEditLine,
  onClearHistory,
  onSpeak,
  showTimestamp,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    return history.filter((h) => 
      h.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.threadName && h.threadName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [history, searchQuery]);

  const stats = useMemo(() => {
    const sentences = history.length;
    const chars = history.reduce((acc, h) => acc + h.text.length, 0);
    return { sentences, chars };
  }, [history]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const fullText = history.map((h) => h.text).join("\n");
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExportText = () => {
    const fullText = history.map((h) => {
      const timeStr = showTimestamp ? `[${new Date(h.timestamp).toLocaleTimeString()}] ` : "";
      return `${timeStr}${h.text}`;
    }).join("\n");
    
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `texthooker-history-${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const saveEditing = (id: string) => {
    onEditLine(id, editingText);
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200/60 dark:border-neutral-800/80 shadow-2xl transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            Hooked History
          </h2>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {stats.sentences} lines, {stats.chars} characters
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-full text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800/80 flex flex-col gap-3">
        <div className="relative flex items-center">
          <SearchIcon size={16} className="absolute left-3 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 dark:text-neutral-200"
          />
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition"
            >
              {copiedAll ? <CheckIcon size={12} className="text-emerald-500" /> : <CopyIcon size={12} />}
              <span>{copiedAll ? "Copied!" : "Copy All"}</span>
            </button>
            
            <button
              onClick={handleExportText}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition"
            >
              <DownloadIcon size={12} />
              <span>Export TXT</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear your text history?")) {
                  onClearHistory();
                }
              }}
              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-950 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition"
              title="Clear all"
            >
              <TrashIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {filteredHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-500 py-12">
            <p className="text-xs font-medium">No history entries found.</p>
            <p className="text-[10px] mt-1">Start playing or use Inject to simulate incoming text!</p>
          </div>
        ) : (
          filteredHistory.map((item, index) => (
            <div
              key={item.id}
              className="group flex flex-col gap-1.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border border-neutral-200/30 dark:border-neutral-800/30 transition-all duration-200 relative"
            >
              {/* Card Header metadata */}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md text-neutral-500 dark:text-neutral-400">
                    #{history.indexOf(item) + 1}
                  </span>
                  {item.threadName && (
                    <span className="truncate max-w-[120px]" title={item.threadName}>
                      {item.threadName}
                    </span>
                  )}
                </div>
                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>

              {/* Card Body (Text or Input) */}
              {editingId === item.id ? (
                <div className="flex gap-1.5">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="flex-1 p-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-16"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => saveEditing(item.id)}
                      className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
                      title="Save"
                    >
                      <CheckIcon size={12} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition cursor-pointer"
                      title="Cancel"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="text-xs text-neutral-800 dark:text-neutral-200 font-serif leading-relaxed select-all cursor-text whitespace-pre-wrap break-all"
                  onDoubleClick={() => startEditing(item.id, item.text)}
                  title="Double click to edit line"
                >
                  {item.text}
                </div>
              )}

              {/* Action Overlay */}
              {editingId !== item.id && (
                <div className="flex justify-end gap-1.5 mt-1 border-t border-neutral-200/20 dark:border-neutral-800/20 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onSpeak(item.text)}
                    className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
                    title="Speak line"
                  >
                    <VolumeIcon size={12} />
                  </button>
                  <button
                    onClick={() => handleCopy(item.id, item.text)}
                    className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
                    title="Copy line"
                  >
                    {copiedId === item.id ? (
                      <CheckIcon size={12} className="text-emerald-500" />
                    ) : (
                      <CopyIcon size={12} />
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteLine(item.id)}
                    className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                    title="Delete line"
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
