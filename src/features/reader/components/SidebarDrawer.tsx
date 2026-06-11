import React, { useState, useEffect } from "react";
import { Book, ReaderSettings, Chapter } from "../types";

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "toc" | "styling" | "search";
  setActiveTab: (tab: "toc" | "styling" | "search") => void;
  book: Book;
  chapters: Omit<Chapter, "content">[];
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
  settings: ReaderSettings;
  onUpdateSettings: (settings: ReaderSettings) => void;
  // Search features
  onSearch: (query: string) => Promise<{ chapterIndex: number; snippet: string; textOffset: number }[]>;
  onNavigateToSearchResult: (chapterIndex: number, textOffset: number) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  book,
  chapters,
  currentChapterIndex,
  onSelectChapter,
  settings,
  onUpdateSettings,
  onSearch,
  onNavigateToSearchResult,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ chapterIndex: number; snippet: string; textOffset: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reset search results when query changes or drawer opens
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
    setSearchResults([]);
  }, [isOpen, activeTab]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };


  return (
    <aside
      className={`fixed top-0 right-0 h-screen w-[380px] z-[4000] flex flex-col border-l border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl text-zinc-300 shadow-2xl transition-transform duration-300 ease-in-out font-sans ${
        isOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
      }`}
    >
      {/* Drawer Header */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-zinc-900 shrink-0">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
          {book.title.length > 25 ? book.title.slice(0, 25) + "…" : book.title}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition cursor-pointer"
          title="Close Panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-zinc-900 bg-zinc-950/50 select-none shrink-0 text-[10px] font-mono font-semibold">
        {[
        { id: "toc", label: "Index", icon: "📑" },
        { id: "styling", label: "Style", icon: "🎨" },
        { id: "search", label: "Search", icon: "🔍" },
      ].map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id as any)}
          className={`flex-1 py-3.5 text-center border-b-2 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
            activeTab === t.id
              ? "border-blue-500 text-white bg-zinc-900/40"
              : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10"
          }`}
        >
          <span className={`block text-sm mb-1 transition-transform duration-200 ${activeTab === t.id ? "scale-110" : "opacity-80"}`}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
      </div>

      {/* Content Canvas */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* --- Tab 1: Index / Table of Contents --- */}
        {activeTab === "toc" && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider font-mono">Chapters</h3>
            {chapters.length === 0 ? (
              <p className="text-xs text-zinc-650 italic">No chapters loaded.</p>
            ) : (
              chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => onSelectChapter(ch.chapterIndex)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                    currentChapterIndex === ch.chapterIndex
                      ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-semibold"
                      : "bg-zinc-900/30 border-zinc-900/50 hover:bg-zinc-900/80 hover:border-zinc-800 text-zinc-300 hover:text-white font-medium"
                  }`}
                >
                  <span className="truncate pr-4 transition-transform duration-200 group-hover:translate-x-0.5">{ch.title}</span>
                  {currentChapterIndex === ch.chapterIndex ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold tracking-wide">Reading</span>
                  ) : (
                    <span className="text-[9px] text-zinc-600 group-hover:text-zinc-400 transition-colors duration-200 font-mono">Ch {idx + 1}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* --- Tab 2: Styling and Customization --- */}
        {activeTab === "styling" && (
          <div className="flex flex-col gap-6">
            {/* Layout Orientation */}
            <div>
              <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider font-mono">Writing Mode</h4>
              <div className="flex gap-2 bg-zinc-900/60 p-1 rounded-xl border border-zinc-900">
                <button
                  onClick={() => onUpdateSettings({ ...settings, writingMode: "horizontal" })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                    settings.writingMode === "horizontal"
                      ? "bg-zinc-800 text-white shadow-md font-semibold"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Horizontal (横書き)
                </button>
                <button
                  onClick={() => onUpdateSettings({ ...settings, writingMode: "vertical" })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                    settings.writingMode === "vertical"
                      ? "bg-zinc-800 text-white shadow-md font-semibold"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Vertical (縦書き)
                </button>
              </div>
            </div>



            {/* Text Sizing sliders */}
            <div className="flex flex-col gap-4 border-t border-zinc-900 pt-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Font Size</h4>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="36"
                  step="1"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-1 rounded bg-zinc-900 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Line Spacing</h4>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">{settings.lineHeight}x</span>
                </div>
                <input
                  type="range"
                  min="1.4"
                  max="2.5"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => onUpdateSettings({ ...settings, lineHeight: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500 h-1 rounded bg-zinc-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Fonts family selection */}
            <div className="border-t border-zinc-900 pt-5">
              <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider font-mono">Font Family</h4>
              <div className="flex gap-2">
                {[
                  { id: "serif", label: "Mincho (Serif)" },
                  { id: "sans", label: "Gothic (Sans)" },
                  { id: "system", label: "System Default" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onUpdateSettings({ ...settings, fontFamily: f.id as any })}
                    className={`flex-1 py-2 rounded-lg border text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                      settings.fontFamily === f.id
                        ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                        : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Margins control */}
            <div>
              <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider font-mono">Page Margins</h4>
              <div className="flex gap-2">
                {[
                  { id: "compact", label: "Narrow" },
                  { id: "normal", label: "Normal" },
                  { id: "wide", label: "Wide" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onUpdateSettings({ ...settings, marginSize: m.id as any })}
                    className={`flex-1 py-2 rounded-lg border text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                      settings.marginSize === m.id
                        ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                        : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Columns count layout */}
            {settings.writingMode === "horizontal" && (
              <div>
                <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider font-mono">Columns Layout</h4>
                <div className="flex gap-2">
                  {[
                    { id: "auto", label: "Adaptive" },
                    { id: 1, label: "Single-Page" },
                    { id: 2, label: "Double-Page" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onUpdateSettings({ ...settings, columnsCount: c.id as any })}
                      className={`flex-1 py-2 rounded-lg border text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                        settings.columnsCount === c.id
                          ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                          : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hover lookup configuration */}
            <div className="border-t border-zinc-900 pt-5 flex flex-col gap-3">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Popup Dictionary</h4>
              
              <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none text-zinc-400 hover:text-zinc-200 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.hoverLookup}
                  onChange={(e) => onUpdateSettings({ ...settings, hoverLookup: e.target.checked })}
                  className="rounded border-zinc-850 bg-zinc-900 text-blue-500 focus:ring-blue-500/40 focus:ring-offset-0 focus:outline-none w-4 h-4"
                />
                <span>Enable hover dictionary lookup</span>
              </label>

              {settings.hoverLookup && (
                <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none text-zinc-400 hover:text-zinc-200 transition-colors pl-6">
                  <input
                    type="checkbox"
                    checked={settings.shiftKeyRequired}
                    onChange={(e) => onUpdateSettings({ ...settings, shiftKeyRequired: e.target.checked })}
                    className="rounded border-zinc-850 bg-zinc-900 text-blue-500 focus:ring-blue-500/40 focus:ring-offset-0 focus:outline-none w-4 h-4"
                  />
                  <span>Require <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 font-mono text-[9px] shadow-sm">Shift</kbd> key to trigger</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* --- Tab 3: Text Search inside Book --- */}
        {activeTab === "search" && (
          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Search Ebook</h3>
            
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Type Japanese/English search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 transition-all"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors duration-200 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/10 active:scale-95"
              >
                {isSearching ? "..." : "Go"}
              </button>
            </form>

            <div className="flex flex-col gap-2.5 mt-2">
              {isSearching && (
                <div className="flex items-center justify-center gap-2 py-10 text-zinc-500 text-xs">
                  <div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
                  <span className="font-mono">Searching chapters...</span>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wide">Found {searchResults.length} matches:</p>
              )}

              {!isSearching && searchResults.length === 0 && searchQuery && (
                <p className="text-xs text-zinc-500 italic py-6 text-center">No results found for &ldquo;{searchQuery}&rdquo;.</p>
              )}

              {!isSearching && searchResults.map((res, index) => {
                const ch = chapters.find(c => c.chapterIndex === res.chapterIndex);
                return (
                  <div
                    key={index}
                    onClick={() => onNavigateToSearchResult(res.chapterIndex, res.textOffset)}
                    className="p-3.5 border border-zinc-900 hover:border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/50 rounded-xl cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-center mb-1.5 text-[10px] font-mono text-blue-400 font-semibold">
                      <span>{ch?.title || `Chapter ${res.chapterIndex + 1}`}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">Jump &rarr;</span>
                    </div>
                    <p
                      className="text-[11px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 break-words"
                      dangerouslySetInnerHTML={{ __html: res.snippet }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Highlights tab has been removed */}
      </div>
    </aside>
  );
};
