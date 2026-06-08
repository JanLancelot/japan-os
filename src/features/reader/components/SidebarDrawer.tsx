import React, { useState, useEffect } from "react";
import { Book, Bookmark, Highlight, VocabularyItem, ReaderSettings, Chapter } from "../types";

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "toc" | "styling" | "search" | "bookmarks" | "vocab";
  setActiveTab: (tab: "toc" | "styling" | "search" | "bookmarks" | "vocab") => void;
  book: Book;
  chapters: Omit<Chapter, "content">[];
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
  settings: ReaderSettings;
  onUpdateSettings: (settings: ReaderSettings) => void;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  onSelectBookmark: (bm: Bookmark) => void;
  onDeleteBookmark: (id: string) => void;
  onSelectHighlight: (hl: Highlight) => void;
  onDeleteHighlight: (id: string) => void;
  vocabulary: VocabularyItem[];
  onDeleteVocab: (id: string) => void;
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
  bookmarks,
  highlights,
  onSelectBookmark,
  onDeleteBookmark,
  onSelectHighlight,
  onDeleteHighlight,
  vocabulary,
  onDeleteVocab,
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

  // Export vocabulary notebook to CSV for Anki import
  const handleExportVocabCSV = () => {
    if (vocabulary.length === 0) return;
    
    // Anki format: Expression, Reading, Definition, Context Sentence, Source Book
    const headers = ["Expression", "Reading", "Definition", "Context Sentence", "Source Book"];
    const rows = vocabulary.map((item) => [
      item.expression,
      item.reading,
      item.definition.replace(/"/g, '""'),
      (item.contextSentence || "").replace(/"/g, '""'),
      (item.bookTitle || "JapanOS Reader").replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${book.title}_vocabulary_notebook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <aside
      className={`fixed top-0 right-0 h-screen w-[380px] z-[4000] flex flex-col border-l border-neutral-900 bg-neutral-950/95 backdrop-blur-md text-neutral-350 shadow-2xl transition-all duration-300 transform translate-x-0 font-sans`}
    >
      {/* Drawer Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-neutral-900 shrink-0">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          {book.title.length > 25 ? book.title.slice(0, 25) + "…" : book.title}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-500 hover:text-white transition cursor-pointer"
          title="Close Panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-neutral-900 bg-neutral-950/40 select-none shrink-0 text-[10px] font-mono font-semibold">
        {[
          { id: "toc", label: "Index", icon: "📑" },
          { id: "styling", label: "Style", icon: "🎨" },
          { id: "search", label: "Search", icon: "🔍" },
          { id: "bookmarks", label: "Marks", icon: "🔖" },
          { id: "vocab", label: "Vocab", icon: "📓" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
              activeTab === t.id
                ? "border-blue-500 text-white bg-neutral-900/50"
                : "border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/20"
            }`}
          >
            <span className="block text-xs mb-0.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content Canvas */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {/* --- Tab 1: Index / Table of Contents --- */}
        {activeTab === "toc" && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider font-mono">Chapters</h3>
            {chapters.length === 0 ? (
              <p className="text-xs text-neutral-600 italic">No chapters loaded.</p>
            ) : (
              chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => onSelectChapter(ch.chapterIndex)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                    currentChapterIndex === ch.chapterIndex
                      ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-semibold"
                      : "bg-neutral-900/20 border-neutral-900 hover:bg-neutral-900/60 hover:border-neutral-800"
                  }`}
                >
                  <span className="truncate pr-4">{ch.title}</span>
                  {currentChapterIndex === ch.chapterIndex && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">Reading</span>
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
              <h4 className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider font-mono">Writing Mode</h4>
              <div className="flex gap-2 bg-neutral-900 p-1 rounded-xl">
                <button
                  onClick={() => onUpdateSettings({ ...settings, writingMode: "horizontal" })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    settings.writingMode === "horizontal"
                      ? "bg-neutral-800 text-white shadow"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  Horizontal (横書き)
                </button>
                <button
                  onClick={() => onUpdateSettings({ ...settings, writingMode: "vertical" })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    settings.writingMode === "vertical"
                      ? "bg-neutral-800 text-white shadow"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  Vertical (縦書き)
                </button>
              </div>
            </div>

            {/* Themes Selection */}
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider font-mono">Color Palette</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "light", label: "☀️ Light Paper", bg: "bg-white border-neutral-300 text-neutral-800" },
                  { id: "sepia", label: "📜 Vintage Sepia", bg: "bg-[#f5ebd6] border-[#e4d6b5] text-[#4a3621]" },
                  { id: "dark", label: "🌙 Dark Modern", bg: "bg-[#121212] border-neutral-800 text-neutral-300" },
                  { id: "midnight", label: "🌌 Deep Midnight", bg: "bg-[#080b11] border-blue-950 text-slate-300" },
                  { id: "forest", label: "🌿 Calming Forest", bg: "bg-[#121b18] border-[#22352e] text-[#cfdfd5]" },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => onUpdateSettings({ ...settings, theme: th.id as any })}
                    className={`px-3 py-2 border rounded-xl text-[10px] font-semibold text-left transition cursor-pointer ${th.bg} ${
                      settings.theme === th.id
                        ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-950"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Sizing sliders */}
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Font Size</h4>
                  <span className="text-[10px] font-mono text-neutral-500">{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="36"
                  step="1"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-1 rounded bg-neutral-900 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Line Spacing</h4>
                  <span className="text-[10px] font-mono text-neutral-500">{settings.lineHeight}x</span>
                </div>
                <input
                  type="range"
                  min="1.4"
                  max="2.5"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => onUpdateSettings({ ...settings, lineHeight: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500 h-1 rounded bg-neutral-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Fonts family selection */}
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-2.5 uppercase tracking-wider font-mono">Font Family</h4>
              <div className="flex gap-2">
                {[
                  { id: "serif", label: "Mincho (Serif)" },
                  { id: "sans", label: "Gothic (Sans)" },
                  { id: "system", label: "System Default" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onUpdateSettings({ ...settings, fontFamily: f.id as any })}
                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition cursor-pointer ${
                      settings.fontFamily === f.id
                        ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-semibold"
                        : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-350"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Margins control */}
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-2.5 uppercase tracking-wider font-mono">Page Margins</h4>
              <div className="flex gap-2">
                {[
                  { id: "compact", label: "Narrow" },
                  { id: "normal", label: "Normal" },
                  { id: "wide", label: "Wide" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onUpdateSettings({ ...settings, marginSize: m.id as any })}
                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition cursor-pointer ${
                      settings.marginSize === m.id
                        ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-semibold"
                        : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-350"
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
                <h4 className="text-xs font-bold text-zinc-400 mb-2.5 uppercase tracking-wider font-mono">Columns Layout</h4>
                <div className="flex gap-2">
                  {[
                    { id: "auto", label: "Adaptive" },
                    { id: 1, label: "Single-Page" },
                    { id: 2, label: "Double-Page" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onUpdateSettings({ ...settings, columnsCount: c.id as any })}
                      className={`flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition cursor-pointer ${
                        settings.columnsCount === c.id
                          ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-semibold"
                          : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-350"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hover lookup configuration */}
            <div className="border-t border-neutral-900 pt-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Popup Dictionary</h4>
              
              <label className="flex items-center gap-2 cursor-pointer text-xs select-none text-neutral-450 hover:text-neutral-300 transition">
                <input
                  type="checkbox"
                  checked={settings.hoverLookup}
                  onChange={(e) => onUpdateSettings({ ...settings, hoverLookup: e.target.checked })}
                  className="rounded border-neutral-800 bg-neutral-900 text-blue-500 focus:ring-blue-500"
                />
                <span>Enable hover dictionary lookup</span>
              </label>

              {settings.hoverLookup && (
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none text-neutral-450 hover:text-neutral-300 transition pl-4">
                  <input
                    type="checkbox"
                    checked={settings.shiftKeyRequired}
                    onChange={(e) => onUpdateSettings({ ...settings, shiftKeyRequired: e.target.checked })}
                    className="rounded border-neutral-800 bg-neutral-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span>Require <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-850 rounded text-neutral-300 font-mono text-[9px]">Shift</kbd> key to trigger</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* --- Tab 3: Text Search inside Book --- */}
        {activeTab === "search" && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Search Ebook</h3>
            
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Type Japanese/English search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? "..." : "Go"}
              </button>
            </form>

            <div className="flex flex-col gap-2.5 mt-2">
              {isSearching && (
                <div className="flex items-center justify-center gap-2 py-8 text-neutral-500 text-xs">
                  <div className="w-4 h-4 border border-t-transparent border-neutral-500 rounded-full animate-spin" />
                  <span>Searching through chapters...</span>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <p className="text-[10px] font-mono text-neutral-550">Found {searchResults.length} matches:</p>
              )}

              {!isSearching && searchResults.length === 0 && searchQuery && (
                <p className="text-xs text-neutral-500 italic py-4 text-center">No results found for &ldquo;{searchQuery}&rdquo;.</p>
              )}

              {!isSearching && searchResults.map((res, index) => {
                const ch = chapters.find(c => c.chapterIndex === res.chapterIndex);
                return (
                  <div
                    key={index}
                    onClick={() => onNavigateToSearchResult(res.chapterIndex, res.textOffset)}
                    className="p-3 border border-neutral-900 hover:border-neutral-800 bg-neutral-950/40 rounded-xl cursor-pointer hover:bg-neutral-900/20 transition group"
                  >
                    <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-blue-400 font-semibold">
                      <span>{ch?.title || `Chapter ${res.chapterIndex + 1}`}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition">Jump &rarr;</span>
                    </div>
                    <p
                      className="text-[11px] leading-relaxed text-neutral-400 group-hover:text-neutral-300 break-words"
                      dangerouslySetInnerHTML={{ __html: res.snippet }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- Tab 4: Bookmarks & Highlights --- */}
        {activeTab === "bookmarks" && (
          <div className="flex flex-col gap-6">
            {/* Bookmarks Section */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 mb-3.5 uppercase tracking-wider font-mono">Bookmarks</h3>
              {bookmarks.length === 0 ? (
                <p className="text-xs text-neutral-600 italic">No bookmarks on this book.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {bookmarks.map((bm) => {
                    const ch = chapters.find(c => c.chapterIndex === bm.chapterIndex);
                    return (
                      <div
                        key={bm.id}
                        onClick={() => onSelectBookmark(bm)}
                        className="group flex justify-between items-center p-3 border border-neutral-900 hover:border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/20 rounded-xl cursor-pointer transition"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-mono text-blue-400 font-semibold mb-0.5">
                            {ch?.title || `Chapter ${bm.chapterIndex + 1}`} (Page {bm.columnIndex + 1})
                          </p>
                          <p className="text-xs text-neutral-450 italic truncate">{bm.textSnippet || "Bookmarked page"}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBookmark(bm.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-neutral-550 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                          title="Delete Bookmark"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Highlights Section */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 mb-3.5 uppercase tracking-wider font-mono">Highlights & Notes</h3>
              {highlights.length === 0 ? (
                <p className="text-xs text-neutral-600 italic">No text highlights in this book.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {highlights.map((hl) => {
                    const ch = chapters.find(c => c.chapterIndex === hl.chapterIndex);
                    const colorClasses = {
                      yellow: "border-l-4 border-yellow-500 bg-yellow-500/5",
                      pink: "border-l-4 border-pink-500 bg-pink-500/5",
                      blue: "border-l-4 border-blue-500 bg-blue-500/5",
                      green: "border-l-4 border-green-500 bg-green-500/5",
                    };
                    return (
                      <div
                        key={hl.id}
                        onClick={() => onSelectHighlight(hl)}
                        className={`group p-3 rounded-xl border border-neutral-900 hover:border-neutral-800 cursor-pointer transition ${colorClasses[hl.color]}`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[9px] font-mono text-neutral-500">
                            {ch?.title || `Chapter ${hl.chapterIndex + 1}`}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteHighlight(hl.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-550 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                            title="Delete Highlight"
                          >
                            🗑️
                          </button>
                        </div>
                        <p className="text-xs text-neutral-200 leading-relaxed font-serif italic mb-2 break-words">&ldquo;{hl.text}&rdquo;</p>
                        {hl.note && (
                          <div className="mt-1.5 border-t border-neutral-900 pt-1.5">
                            <p className="text-[11px] text-neutral-400 leading-relaxed font-mono flex items-start gap-1">
                              <span className="text-neutral-500 shrink-0 font-sans">📝</span>
                              <span className="break-words">{hl.note}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Tab 5: Vocabulary Notebook --- */}
        {activeTab === "vocab" && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Vocab Notebook</h3>
              {vocabulary.length > 0 && (
                <button
                  onClick={handleExportVocabCSV}
                  className="px-2 py-1 border border-neutral-800 hover:border-neutral-700 bg-neutral-900 rounded-lg text-[9px] font-mono font-bold text-neutral-350 hover:text-white transition cursor-pointer"
                  title="Export for Anki import"
                >
                  📤 Export CSV
                </button>
              )}
            </div>

            {vocabulary.length === 0 ? (
              <p className="text-xs text-neutral-600 italic py-4 text-center">No words added to vocabulary notebook yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {vocabulary.map((vocab) => (
                  <div
                    key={vocab.id}
                    className="group p-3.5 border border-neutral-900 bg-neutral-950/40 rounded-xl transition flex flex-col gap-2 relative hover:border-neutral-800"
                  >
                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteVocab(vocab.id)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-neutral-550 hover:text-red-400 transition cursor-pointer text-[10px]"
                      title="Remove word"
                    >
                      ❌
                    </button>

                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold font-serif text-white">{vocab.expression}</span>
                        {vocab.reading && (
                          <span className="text-[10px] text-neutral-500 font-mono">（{vocab.reading}）</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 leading-normal break-words">{vocab.definition}</p>
                    </div>

                    {vocab.contextSentence && (
                      <div className="border-t border-neutral-900/60 pt-2 text-[10px] leading-relaxed text-neutral-500 font-serif italic break-words">
                        &ldquo;{vocab.contextSentence}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
