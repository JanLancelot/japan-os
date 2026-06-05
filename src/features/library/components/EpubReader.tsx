"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as db from "../database/libraryDb";

function resolveRelativePath(basePath: string, relativePath: string): string {
  if (relativePath.includes("://") || relativePath.startsWith("data:")) {
    return relativePath;
  }
  const decodedRelative = decodeURIComponent(relativePath);
  const baseParts = basePath.split("/");
  baseParts.pop(); // Remove filename
  
  const relParts = decodedRelative.split("/");
  for (const part of relParts) {
    if (part === "" || part === ".") {
      continue;
    } else if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  return baseParts.join("/");
}

export function EpubReader() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") || "";

  const [book, setBook] = useState<db.Book | null>(null);
  const [chapters, setChapters] = useState<db.Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [renderedHtml, setRenderedHtml] = useState("");
  const [imageUrlsMap, setImageUrlsMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout & Styling state
  const [fontSize, setFontSize] = useState(24);
  const [lineSpacing, setLineSpacing] = useState(1.8);
  const [letterSpacing, setLetterSpacing] = useState(0.04);
  const [theme, setTheme] = useState("midnight");
  const [fontFamily, setFontFamily] = useState("serif");

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch book data & chapters on mount
  useEffect(() => {
    if (!bookId) {
      setError("No Book ID specified.");
      setLoading(false);
      return;
    }

    const loadBookData = async () => {
      setLoading(true);
      setError(null);
      try {
        const bookData = await db.getBook(bookId);
        if (!bookData) {
          setError("Book not found in library.");
          return;
        }
        setBook(bookData);

        // Apply saved typography settings
        if (bookData.fontSize) setFontSize(bookData.fontSize);
        if (bookData.lineSpacing) setLineSpacing(bookData.lineSpacing);
        if (bookData.letterSpacing) setLetterSpacing(bookData.letterSpacing);
        if (bookData.theme) setTheme(bookData.theme);
        if (bookData.fontFamily) setFontFamily(bookData.fontFamily);

        const chapterList = await db.getBookChapters(bookId);
        setChapters(chapterList);
        setCurrentChapterIndex(bookData.currentChapterIndex || 0);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load book from database.");
      } finally {
        setLoading(false);
      }
    };

    loadBookData();
  }, [bookId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setChapterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Load and process chapter HTML contents + images
  useEffect(() => {
    if (chapters.length === 0) return;

    const chapter = chapters[currentChapterIndex];
    if (!chapter) return;

    let activeUrls: string[] = [];

    const loadChapterResources = async () => {
      try {
        // Load images
        const imagesList = await db.getBookImages(bookId);
        const urlsMap: Record<string, string> = {};
        
        imagesList.forEach((img) => {
          const url = URL.createObjectURL(img.blob);
          urlsMap[img.filePath] = url;
          activeUrls.push(url);
        });

        setImageUrlsMap(urlsMap);

        // Process XHTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(chapter.content, "text/html");

        // Resolve images src
        const imgs = doc.querySelectorAll("img");
        imgs.forEach((img) => {
          const src = img.getAttribute("src") || "";
          const resolved = resolveRelativePath(chapter.filePath, src);
          if (urlsMap[resolved]) {
            img.setAttribute("src", urlsMap[resolved]);
          }
        });

        // Resolve SVG images
        const svgImgs = doc.querySelectorAll("image");
        svgImgs.forEach((img) => {
          const href = img.getAttribute("href") || img.getAttribute("xlink:href") || "";
          const resolved = resolveRelativePath(chapter.filePath, href);
          if (urlsMap[resolved]) {
            img.setAttribute("href", urlsMap[resolved]);
            img.removeAttribute("xlink:href");
          }
        });

        // Remove EPUB custom stylings that conflict with reader mode
        doc.querySelectorAll("link[rel='stylesheet']").forEach((el) => el.remove());
        doc.querySelectorAll("style").forEach((el) => el.remove());

        setRenderedHtml(doc.body.innerHTML);
      } catch (err) {
        console.error("Error loading chapter assets:", err);
      }
    };

    loadChapterResources();

    // Revoke previous URLs to prevent memory leaks
    return () => {
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [currentChapterIndex, chapters, bookId]);

  // 3. Handle scroll restoration after HTML rendering
  useEffect(() => {
    if (containerRef.current && renderedHtml) {
      const el = containerRef.current;
      
      const restoreScroll = () => {
        if (book && book.currentChapterIndex === currentChapterIndex) {
          el.scrollLeft = book.scrollPosition;
        } else {
          el.scrollLeft = 0; // Starts at rightmost side (0 in vertical-rl)
        }
        
        // Recalculate progress on load
        handleScroll();
      };

      const id = setTimeout(restoreScroll, 120);
      return () => clearTimeout(id);
    }
  }, [renderedHtml, currentChapterIndex, book]);

  // 4. Keyboard Arrow page turns (Japanese style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = containerRef.current;
      if (!el) return;

      const pageScrollAmount = el.clientWidth * 0.85;

      if (e.key === "ArrowLeft") {
        // Next page (scrolling to the left)
        el.scrollBy({
          left: -pageScrollAmount,
          behavior: "smooth",
        });
      } else if (e.key === "ArrowRight") {
        // Previous page (scrolling to the right)
        el.scrollBy({
          left: pageScrollAmount,
          behavior: "smooth",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 5. Track scrolling to update progress
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || chapters.length === 0) return;

    setScrollPosition(el.scrollLeft);

    const maxScroll = el.scrollWidth - el.clientWidth;
    let ratio = 0;
    
    if (maxScroll > 0) {
      // In vertical-rl, scrollLeft goes from 0 (far right) to -maxScroll (far left)
      ratio = Math.abs(el.scrollLeft) / maxScroll;
    }

    const totalChapters = chapters.length;
    const progressVal = ((currentChapterIndex + ratio) / totalChapters) * 100;
    setProgressPercent(Math.min(100, Math.max(0, progressVal)));
  };

  // 6. Debounced Progress Update in IndexedDB
  useEffect(() => {
    if (!bookId || chapters.length === 0) return;

    const timer = setTimeout(() => {
      db.updateBookProgress(bookId, currentChapterIndex, scrollPosition, progressPercent);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentChapterIndex, scrollPosition, progressPercent, bookId, chapters.length]);

  // Save specific settings changes to DB (debounced)
  useEffect(() => {
    if (!bookId) return;

    const timer = setTimeout(() => {
      db.updateBookSettings(bookId, {
        fontSize,
        lineSpacing,
        letterSpacing,
        theme,
        fontFamily,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [fontSize, lineSpacing, letterSpacing, theme, fontFamily, bookId]);

  // Navigation handlers
  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex((prev) => prev - 1);
    }
  };

  const handleChapterSelect = (idx: number) => {
    setCurrentChapterIndex(idx);
    setChapterDropdownOpen(false);
  };

  const handleInternalLink = (href: string) => {
    if (href.startsWith("#")) {
      // Anchor tag scroll
      const el = containerRef.current?.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    // Split filename and optional anchor hash
    const [pathPart, hashPart] = href.split("#");
    
    // Find matching chapter in manifest path
    const matchedIndex = chapters.findIndex((c) => {
      const filename = c.filePath.split("/").pop() || "";
      return filename.toLowerCase() === pathPart.toLowerCase() || c.filePath.toLowerCase().endsWith(pathPart.toLowerCase());
    });

    if (matchedIndex !== -1) {
      setCurrentChapterIndex(matchedIndex);
      
      if (hashPart) {
        // If there's a hash, wait for render then scroll
        setTimeout(() => {
          const el = containerRef.current?.querySelector(`#${hashPart}`);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor) {
      e.preventDefault();
      const href = anchor.getAttribute("href");
      if (href) {
        handleInternalLink(href);
      }
    }
  };

  // Styling helper classes
  const getThemeClass = () => {
    switch (theme) {
      case "light":
        return "bg-zinc-50 text-zinc-900";
      case "sepia":
        return "bg-[#fcf8ed] text-[#433422]";
      case "dark":
        return "bg-zinc-950 text-zinc-200 border-neutral-900";
      case "midnight":
      default:
        return "bg-black text-neutral-300 border-neutral-950";
    }
  };

  const getContainerTheme = () => {
    switch (theme) {
      case "light":
        return "bg-white border-zinc-200/50 shadow-zinc-200/40";
      case "sepia":
        return "bg-[#f4ebd0] border-[#d5c396]/40 shadow-orange-950/5";
      case "dark":
        return "bg-zinc-900/30 border-zinc-800/40";
      case "midnight":
      default:
        return "bg-neutral-900/10 border-neutral-900/30";
    }
  };

  const getFontFamilyClass = () => {
    switch (fontFamily) {
      case "serif":
        return 'font-serif font-["Hiragino Mincho ProN","Yu_Mincho",YuMincho,"Hiragino_Mincho_ProN","MS_Mincho","Noto_Serif_JP",serif]';
      case "rounded":
        return 'font-mono font-["Hiragino_Maru_Gothic_ProN",Meiryo,"Kosugi_Maru",monospace]';
      case "sans":
      default:
        return 'font-sans font-[system-ui,-apple-system,Meiryo,"Hiragino_Kaku_Gothic_ProN","Noto_Sans_JP",sans-serif]';
    }
  };

  const currentChapter = chapters[currentChapterIndex];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black text-neutral-400 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-neutral-800 animate-spin" />
          <span className="text-xs font-medium tracking-wide">Opening book...</span>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black text-neutral-400 min-h-screen p-8 text-center">
        <div className="max-w-md flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-950/20 text-red-500 border border-red-900/20 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-zinc-200">Error Loading Book</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">{error || "Failed to load reader."}</p>
          <Link
            href="/library"
            className="mt-4 text-xs font-semibold py-2 px-5 rounded-xl border border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300 transition cursor-pointer"
          >
            Return to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 h-screen w-screen overflow-hidden transition-colors duration-300 relative select-text ${getThemeClass()}`}>
      
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b select-none z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/library"
            className="p-2 rounded-xl border border-neutral-800/40 hover:bg-neutral-800/20 hover:border-neutral-700/50 text-neutral-400 hover:text-neutral-100 transition cursor-pointer"
            title="Back to Library"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>

          {/* Book Title & Chapter Select Dropdown */}
          <div className="flex flex-col select-none relative" ref={dropdownRef}>
            <span className="text-[10px] text-neutral-500 font-sans tracking-wide truncate max-w-[180px] sm:max-w-xs">{book.title}</span>
            <button
              onClick={() => setChapterDropdownOpen(!chapterDropdownOpen)}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-100 hover:text-white text-left font-serif leading-none mt-0.5"
            >
              <span className="truncate max-w-[180px] sm:max-w-xs">
                {currentChapter ? currentChapter.title : `Chapter ${currentChapterIndex + 1}`}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`text-neutral-400 transition-transform duration-200 ${chapterDropdownOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {chapterDropdownOpen && (
              <div className="absolute top-full left-0 mt-2.5 w-64 max-h-72 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 py-1.5 scrollbar-thin animate-in fade-in zoom-in-95 duration-100">
                {chapters.map((chap, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChapterSelect(idx)}
                    className={`w-full text-left px-4 py-2 text-xs font-serif transition-colors truncate block ${
                      idx === currentChapterIndex
                        ? "bg-blue-600 text-white font-semibold"
                        : "text-neutral-300 hover:bg-neutral-800"
                    }`}
                  >
                    {chap.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side settings toggle button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl border border-neutral-800/40 hover:bg-neutral-800/20 hover:border-neutral-700/50 text-neutral-400 hover:text-neutral-100 transition cursor-pointer ${
            showSettings ? "bg-neutral-800/30 text-white" : ""
          }`}
          title="Reader Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>
      </header>

      {/* Main Core Reading Layout */}
      <div className="flex-1 flex w-full h-full overflow-hidden relative">
        
        {/* Floating Page Navigators (Overlay sides) - Left: Next, Right: Prev */}
        {/* Note: since vertical-rl layouts read from right-to-left, Next is on the Left, and Prev is on the Right! */}
        <div 
          onClick={() => {
            containerRef.current?.scrollBy({
              left: -containerRef.current.clientWidth * 0.85,
              behavior: "smooth",
            });
          }}
          className="absolute left-0 top-16 bottom-16 w-12 sm:w-16 hover:bg-neutral-500/5 cursor-pointer z-20 flex items-center justify-center text-neutral-600 hover:text-neutral-300 opacity-0 hover:opacity-100 transition duration-300 select-none"
          title="Next Page (ArrowLeft)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>

        <div 
          onClick={() => {
            containerRef.current?.scrollBy({
              left: containerRef.current.clientWidth * 0.85,
              behavior: "smooth",
            });
          }}
          className="absolute right-0 top-16 bottom-16 w-12 sm:w-16 hover:bg-neutral-500/5 cursor-pointer z-20 flex items-center justify-center text-neutral-600 hover:text-neutral-300 opacity-0 hover:opacity-100 transition duration-300 select-none"
          title="Previous Page (ArrowRight)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* Scrollable Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onClick={handleContentClick}
          className={`flex-1 overflow-x-auto overflow-y-hidden select-text scrollbar-none h-full w-full flex justify-end pb-8 pt-6 px-16 sm:px-24 ${getFontFamilyClass()}`}
        >
          <div
            className="h-full vertical-content-wrapper"
            style={{
              writingMode: "vertical-rl",
              WebkitWritingMode: "vertical-rl",
              fontSize: `${fontSize}px`,
              lineHeight: lineSpacing,
              letterSpacing: `${letterSpacing}em`,
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>

        {/* Floating Settings Drawer Panel (Sidebar) */}
        {showSettings && (
          <div className="absolute right-4 top-16 w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-6 z-40 select-none animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">Typography Options</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded transition cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Themes Option */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Theme</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "light", label: "Light", bg: "bg-white border-zinc-200 text-zinc-950" },
                  { id: "sepia", label: "Sepia", bg: "bg-[#fcf8ed] border-[#e8d5b5] text-[#433422]" },
                  { id: "dark", label: "Dark", bg: "bg-zinc-900 border-zinc-800 text-zinc-200" },
                  { id: "midnight", label: "Midnight", bg: "bg-black border-neutral-950 text-neutral-400" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-[9px] font-semibold border transition cursor-pointer ${t.bg} ${
                      theme === t.id ? "ring-2 ring-blue-500 scale-102 border-blue-500" : "hover:scale-102"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family Option */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Font Family</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "serif", label: "明朝体", desc: "Mincho" },
                  { id: "sans", label: "ゴシック", desc: "Gothic" },
                  { id: "rounded", label: "丸ゴシック", desc: "Maru" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontFamily(f.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 bg-neutral-800 hover:bg-neutral-800/80 text-neutral-200 border rounded-xl transition cursor-pointer ${
                      fontFamily === f.id ? "border-blue-500 text-white font-bold bg-neutral-800/40" : "border-neutral-800"
                    }`}
                  >
                    <span className="text-xs font-serif">{f.label}</span>
                    <span className="text-[8px] text-neutral-500 mt-0.5">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Option */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Font Size</span>
                <span className="text-xs font-mono font-bold text-neutral-300">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="48"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Line Spacing Option */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Line Spacing</span>
                <span className="text-xs font-mono font-bold text-neutral-300">{lineSpacing}</span>
              </div>
              <input
                type="range"
                min="1.4"
                max="2.6"
                step="0.1"
                value={lineSpacing}
                onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Letter Spacing Option */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Character Spacing</span>
                <span className="text-xs font-mono font-bold text-neutral-300">{letterSpacing}em</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.15"
                step="0.01"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setFontSize(24);
                setLineSpacing(1.8);
                setLetterSpacing(0.04);
                setTheme("midnight");
                setFontFamily("serif");
              }}
              className="mt-2 text-center text-xs font-semibold py-2 bg-neutral-800 hover:bg-neutral-800/80 hover:text-white border border-neutral-700 text-neutral-300 rounded-xl cursor-pointer"
            >
              Reset to default
            </button>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <footer className="flex flex-col gap-2.5 px-6 py-3 border-t select-none z-30">
        
        {/* Navigation buttons + Scroll progress slider */}
        <div className="flex items-center gap-6">
          
          {/* Prev Chapter */}
          <button
            onClick={handlePrevChapter}
            disabled={currentChapterIndex === 0}
            className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800/30 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Previous Chapter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Book progress track */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-[10px] text-neutral-500 font-mono select-none">
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </span>
            <div className="flex-1 h-1 bg-neutral-800/60 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-neutral-400 font-bold select-none w-10 text-right">
              {Math.round(progressPercent)}%
            </span>
          </div>

          {/* Next Chapter */}
          <button
            onClick={handleNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
            className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800/30 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Next Chapter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </footer>

      {/* Inject custom CSS classes for authentic vertical writing layouts */}
      <style jsx global>{`
        .vertical-content-wrapper {
          display: block;
          column-width: 32rem; /* Column height standard */
          column-gap: 4rem;    /* Padding between vertical page spreads */
          height: 100%;
          text-align: justify;
          color: inherit;
        }

        @media (max-width: 640px) {
          .vertical-content-wrapper {
            column-width: 80vw;
            column-gap: 2.5rem;
          }
        }

        .vertical-content-wrapper p {
          margin-top: 0;
          margin-bottom: 0;
          text-indent: 1em; /* Authentic novel paragraph indents */
          margin-left: 0.8em; /* spacing between vertical lines */
          line-height: inherit;
        }

        .vertical-content-wrapper h1,
        .vertical-content-wrapper h2,
        .vertical-content-wrapper h3,
        .vertical-content-wrapper h4,
        .vertical-content-wrapper h5,
        .vertical-content-wrapper h6 {
          font-family: inherit;
          font-weight: bold;
          line-height: 1.4;
          margin-left: 1.5em; /* vertical page margins */
          margin-top: 0;
          margin-bottom: 0;
          text-indent: 0;
          display: block;
        }

        .vertical-content-wrapper h1 { font-size: 1.4em; }
        .vertical-content-wrapper h2 { font-size: 1.25em; }
        .vertical-content-wrapper h3 { font-size: 1.15em; }

        .vertical-content-wrapper img,
        .vertical-content-wrapper svg,
        .vertical-content-wrapper image {
          max-height: 85% !important;
          max-width: 85% !important;
          object-fit: contain;
          margin: 0 auto;
          display: inline-block;
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `}</style>
    </div>
  );
}
