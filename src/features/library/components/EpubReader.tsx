"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [chapterHtml, setChapterHtml] = useState<string>("");
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pendingPageToGo, setPendingPageToGo] = useState<number | 'last' | null>(null);
  const [imageUrlsMap, setImageUrlsMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout & Styling state matching Svelte reader variables
  const [viewMode, setViewMode] = useState<"paginated" | "continuous">("paginated");
  const [verticalMode, setVerticalMode] = useState(true);
  const [fontFamily, setFontFamily] = useState("serif"); // 'serif', 'sans', 'rounded'
  const [fontSize, setFontSize] = useState(24);
  const [lineSpacing, setLineSpacing] = useState(1.8);
  const [letterSpacing, setLetterSpacing] = useState(0.04);
  const [textIndentation, setTextIndentation] = useState(1); // rem/em
  const [theme, setTheme] = useState("midnight");
  const [hideFurigana, setHideFurigana] = useState(false);
  const [hideSpoilerImage, setHideSpoilerImage] = useState(true);
  
  // Advanced WakeLock / UI warning states
  const [enableWakeLock, setEnableWakeLock] = useState(true);
  const [showBlurMessage, setShowBlurMessage] = useState(false);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [geminiApiKey, setGeminiApiKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGeminiApiKey(localStorage.getItem("gemini_api_key") || "");
    }
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageStep, setPageStep] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);

  // WakeLock Logic
  const requestWakeLock = useCallback(async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return;
      }
      wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
    } catch (err) {
      console.warn("Failed to request wake lock", err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        // no-op
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enableWakeLock && typeof document !== "undefined" && document.visibilityState === "visible") {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [enableWakeLock, requestWakeLock, releaseWakeLock]);

  // Handle visibility change for WakeLock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enableWakeLock) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enableWakeLock, requestWakeLock]);

  // MutationObserver for Blur Message
  useEffect(() => {
    if (!contentRef.current) return;
    
    const handleMutation = (mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        if (mutation.target instanceof HTMLElement) {
          const style = mutation.target.style.filter || "";
          setShowBlurMessage(style.includes("blur"));
        }
      }
    };

    const observer = new MutationObserver(handleMutation);
    observer.observe(contentRef.current, { attributes: true, attributeFilter: ["style"] });

    return () => {
      observer.disconnect();
    };
  }, [chapterHtml]);

  // Update layout and paginate content
  const updateLayout = useCallback(() => {
    if (viewportRef.current && contentRef.current) {
      const originalTransform = contentRef.current.style.transform;
      contentRef.current.style.transform = "none";
      
      const vWidth = viewportRef.current.offsetWidth;
      const vHeight = viewportRef.current.offsetHeight;
      const sWidth = contentRef.current.scrollWidth;
      
      contentRef.current.style.transform = originalTransform;
      
      if (vWidth > 0) {
        setViewportWidth(vWidth);
        setViewportHeight(vHeight);
        
        const paddingX = vWidth < 640 ? 32 : 64;
        const innerW = vWidth - 2 * paddingX;
        
        if (viewMode === "paginated") {
          const numCols = Math.max(1, Math.ceil(sWidth / innerW));
          setTotalPages(numCols);
          setPageStep(innerW);
        } else {
          setTotalPages(1);
          setPageStep(0);
        }
      }
    }
  }, [viewMode]);

  // Recalculate layout on resize
  useEffect(() => {
    const handleResize = () => {
      updateLayout();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateLayout]);

  // Recalculate layout when content or typography changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateLayout();
      setLayoutReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [chapterHtml, fontSize, lineSpacing, letterSpacing, fontFamily, viewMode, verticalMode, updateLayout]);

  // Clamp current page index to total pages
  useEffect(() => {
    if (currentPageIndex >= totalPages) {
      setCurrentPageIndex(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPageIndex]);

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

        // Apply saved typography settings if available
        if (bookData.fontSize) setFontSize(bookData.fontSize);
        if (bookData.lineSpacing) setLineSpacing(bookData.lineSpacing);
        if (bookData.letterSpacing) setLetterSpacing(bookData.letterSpacing);
        if (bookData.theme) setTheme(bookData.theme);
        if (bookData.fontFamily) setFontFamily(bookData.fontFamily);

        const chapterList = await db.getBookChapters(bookId);
        setChapters(chapterList);
        setCurrentChapterIndex(bookData.currentChapterIndex || 0);
        setCurrentPageIndex(bookData.scrollPosition || 0);
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

        setChapterHtml(doc.body.innerHTML);
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

  // Reset scroll position on page/chapter change
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  }, [currentPageIndex, currentChapterIndex]);

  // Handle pending page updates (e.g. going to previous chapter starts at the last page)
  useEffect(() => {
    if (totalPages > 0 && pendingPageToGo !== null) {
      if (pendingPageToGo === 'last') {
        setCurrentPageIndex(totalPages - 1);
      } else {
        setCurrentPageIndex(Math.min(pendingPageToGo, totalPages - 1));
      }
      setPendingPageToGo(null);
    }
  }, [totalPages, pendingPageToGo]);

  // Recalculate progress when chapter, page, or pages count changes
  useEffect(() => {
    if (chapters.length === 0) return;
    const totalChapters = chapters.length;
    const ratio = totalPages > 0 ? currentPageIndex / totalPages : 0;
    const progressVal = ((currentChapterIndex + ratio) / totalChapters) * 100;
    setProgressPercent(Math.min(100, Math.max(0, progressVal)));
  }, [currentPageIndex, currentChapterIndex, chapters.length, totalPages]);

  const handleNextPage = useCallback(() => {
    if (viewMode === "continuous") {
      // In continuous mode, next chapter
      if (currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex((prev) => prev + 1);
      }
      return;
    }
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    } else if (currentChapterIndex < chapters.length - 1) {
      setCurrentPageIndex(0);
      setCurrentChapterIndex((prev) => prev + 1);
    }
  }, [currentPageIndex, totalPages, currentChapterIndex, chapters.length, viewMode]);

  const handlePrevPage = useCallback(() => {
    if (viewMode === "continuous") {
      // In continuous mode, prev chapter
      if (currentChapterIndex > 0) {
        setCurrentChapterIndex((prev) => prev - 1);
      }
      return;
    }
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    } else if (currentChapterIndex > 0) {
      setPendingPageToGo('last');
      setCurrentChapterIndex((prev) => prev - 1);
    }
  }, [currentPageIndex, currentChapterIndex, viewMode]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (verticalMode) {
          handleNextPage();
        } else {
          handlePrevPage();
        }
      } else if (e.key === "ArrowRight") {
        if (verticalMode) {
          handlePrevPage();
        } else {
          handleNextPage();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextPage, handlePrevPage, verticalMode]);

  // Debounced Progress Update in IndexedDB
  useEffect(() => {
    if (!bookId || chapters.length === 0) return;

    const timer = setTimeout(() => {
      db.updateBookProgress(bookId, currentChapterIndex, currentPageIndex, progressPercent);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentChapterIndex, currentPageIndex, progressPercent, bookId, chapters.length]);

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

  const handleChapterSelect = (idx: number) => {
    setCurrentChapterIndex(idx);
    setCurrentPageIndex(0);
    setChapterDropdownOpen(false);
  };

  const handleInternalLink = (href: string) => {
    if (href.startsWith("#")) {
      const el = contentRef.current?.querySelector(href);
      if (el && viewportWidth > 0 && contentRef.current) {
        const rect = el.getBoundingClientRect();
        const containerRect = contentRef.current.getBoundingClientRect();
        const absoluteRight = (containerRect.right - rect.right) + (currentPageIndex * viewportWidth);
        const targetPage = Math.floor(absoluteRight / viewportWidth);
        setCurrentPageIndex(Math.min(targetPage, totalPages - 1));
      }
      return;
    }

    const [pathPart, hashPart] = href.split("#");
    
    const matchedIndex = chapters.findIndex((c) => {
      const filename = c.filePath.split("/").pop() || "";
      return filename.toLowerCase() === pathPart.toLowerCase() || c.filePath.toLowerCase().endsWith(pathPart.toLowerCase());
    });

    if (matchedIndex !== -1) {
      setCurrentChapterIndex(matchedIndex);
      setCurrentPageIndex(0);
      
      if (hashPart) {
        setTimeout(() => {
          const el = contentRef.current?.querySelector(`#${hashPart}`);
          if (el && viewportWidth > 0 && contentRef.current) {
            const rect = el.getBoundingClientRect();
            const containerRect = contentRef.current.getBoundingClientRect();
            const absoluteRight = containerRect.right - rect.right;
            const targetPage = Math.floor(absoluteRight / viewportWidth);
            setCurrentPageIndex(Math.min(targetPage, totalPages - 1));
          }
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

  // Theme styling helpers
  const getThemeClass = () => {
    switch (theme) {
      case "light":
        return "bg-zinc-50 text-zinc-900 border-zinc-200";
      case "sepia":
        return "bg-[#fcf8ed] text-[#433422] border-[#e8d5b5]";
      case "dark":
        return "bg-zinc-950 text-zinc-200 border-neutral-900";
      case "midnight":
      default:
        return "bg-black text-neutral-300 border-neutral-950";
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

  const currentChapter = chapters[currentChapterIndex];
  const paddingX = viewportWidth < 640 ? 32 : 64;
  const paddingY = viewportWidth < 640 ? 40 : 60;
  const innerWidth = viewportWidth > 0 ? viewportWidth - 2 * paddingX : 600;
  const colGap = viewportWidth < 640 ? 48 : 80;
  const colWidth = innerWidth - colGap;

  // Render continuous vs paginated custom offsets
  const scrollContainerStyle = viewMode === "continuous" 
    ? {
        overflowY: verticalMode ? "hidden" : "auto",
        overflowX: verticalMode ? "auto" : "hidden",
        width: "100%",
        height: "100%",
      } as React.CSSProperties
    : {};

  const contentTranslate = viewMode === "paginated" 
    ? `translateX(${currentPageIndex * (pageStep || innerWidth || 0)}px)` 
    : "none";

  return (
    <div className={`flex flex-col h-[100dvh] w-full max-h-[100dvh] overflow-hidden transition-colors duration-300 relative select-text ${getThemeClass()}`}>
      
      {/* External App Blur Alert overlay */}
      {showBlurMessage && (
        <div
          className="fixed top-12 right-4 p-3 border max-w-[90vw] z-50 text-xs font-medium rounded-xl shadow-xl animate-bounce"
          style={{
            writingMode: "horizontal-tb",
            color: theme === "light" ? "#111827" : "#f3f4f6",
            backgroundColor: theme === "light" ? "#f3f4f6" : "#111827",
            borderColor: theme === "light" ? "#e5e7eb" : "#374151",
          }}
        >
          The reader is currently blurred due to an external application (e.g. exstatic)
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b select-none z-30 bg-inherit">
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
      <div className="flex-1 flex w-full overflow-hidden relative">
        
        {/* Floating Page Navigators (Overlay sides) - Left: Next, Right: Prev in vertical-rl */}
        <div 
          onClick={handleNextPage}
          className="absolute left-0 top-16 bottom-16 w-12 sm:w-16 hover:bg-neutral-500/5 cursor-pointer z-20 flex items-center justify-center text-neutral-600 hover:text-neutral-300 opacity-0 hover:opacity-100 transition duration-300 select-none"
          title={verticalMode ? "Next Page" : "Previous Page"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>

        <div 
          onClick={handlePrevPage}
          className="absolute right-0 top-16 bottom-16 w-12 sm:w-16 hover:bg-neutral-500/5 cursor-pointer z-20 flex items-center justify-center text-neutral-600 hover:text-neutral-300 opacity-0 hover:opacity-100 transition duration-300 select-none"
          title={verticalMode ? "Previous Page" : "Next Page"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* Viewport Container (with fixed padding) */}
        <div
          ref={viewportRef}
          className={`flex-1 select-text relative ${getFontFamilyClass()}`}
          style={{
            ...scrollContainerStyle,
            paddingTop: `${paddingY}px`,
            paddingBottom: `${paddingY}px`,
            paddingLeft: `${paddingX}px`,
            paddingRight: `${paddingX}px`,
            boxSizing: "border-box",
          }}
        >
          {/* Inner Content Box (clipping area) */}
          <div className="w-full h-full relative overflow-hidden">
            <div
              ref={contentRef}
              className={`vertical-content-wrapper ${hideFurigana ? "hide-furigana" : ""} ${hideSpoilerImage ? "hide-spoiler-image" : ""}`}
              style={{
                writingMode: verticalMode ? "vertical-rl" : "horizontal-tb",
                WebkitWritingMode: verticalMode ? "vertical-rl" : "horizontal-tb",
                fontSize: `${fontSize}px`,
                lineHeight: lineSpacing,
                letterSpacing: `${letterSpacing}em`,
                transform: contentTranslate,
                transition: viewMode === "paginated" ? "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
                position: viewMode === "paginated" ? "absolute" : "relative",
                right: 0,
                top: 0,
                columnFill: "auto",
                boxSizing: "border-box",
                columnWidth: viewMode === "paginated" ? `${colWidth}px` : "auto",
                columnGap: viewMode === "paginated" ? `${colGap}px` : "normal",
                textIndent: `${textIndentation}em`,
              } as React.CSSProperties}
              onClick={handleContentClick}
              dangerouslySetInnerHTML={{ __html: chapterHtml }}
            />
          </div>
        </div>

        {/* Floating Settings Drawer Panel (Sidebar) */}
        {showSettings && (
          <div className="absolute right-4 top-16 w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-5 z-40 select-none animate-in slide-in-from-right duration-250 text-neutral-300">
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

            {/* View Mode & Direction */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Layout mode</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewMode("paginated")}
                  className={`py-1.5 text-xs rounded-lg border transition font-medium ${
                    viewMode === "paginated" ? "border-blue-500 bg-blue-600/10 text-white" : "border-neutral-800 hover:bg-neutral-800"
                  }`}
                >
                  Paginated
                </button>
                <button
                  onClick={() => setViewMode("continuous")}
                  className={`py-1.5 text-xs rounded-lg border transition font-medium ${
                    viewMode === "continuous" ? "border-blue-500 bg-blue-600/10 text-white" : "border-neutral-800 hover:bg-neutral-800"
                  }`}
                >
                  Continuous
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => setVerticalMode(true)}
                  className={`py-1.5 text-xs rounded-lg border transition font-medium ${
                    verticalMode ? "border-blue-500 bg-blue-600/10 text-white" : "border-neutral-800 hover:bg-neutral-800"
                  }`}
                >
                  縦書き (Vertical)
                </button>
                <button
                  onClick={() => setVerticalMode(false)}
                  className={`py-1.5 text-xs rounded-lg border transition font-medium ${
                    !verticalMode ? "border-blue-500 bg-blue-600/10 text-white" : "border-neutral-800 hover:bg-neutral-800"
                  }`}
                >
                  横書き (Horizontal)
                </button>
              </div>
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
                <span className="text-xs font-mono font-bold text-neutral-350">{fontSize}px</span>
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
                <span className="text-xs font-mono font-bold text-neutral-350">{lineSpacing}</span>
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

            {/* WakeLock Toggle */}
            <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
              <span className="text-xs font-medium">Enable WakeLock</span>
              <button
                onClick={() => setEnableWakeLock(!enableWakeLock)}
                className={`w-9 h-5 rounded-full transition-colors relative ${enableWakeLock ? "bg-blue-600" : "bg-neutral-700"}`}
              >
                <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 left-0.75 transition-transform ${enableWakeLock ? "translate-x-4" : ""}`} />
              </button>
            </div>

            {/* Toggle Furigana / Spoiler */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Hide Furigana</span>
              <button
                onClick={() => setHideFurigana(!hideFurigana)}
                className={`w-9 h-5 rounded-full transition-colors relative ${hideFurigana ? "bg-blue-600" : "bg-neutral-700"}`}
              >
                <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 left-0.75 transition-transform ${hideFurigana ? "translate-x-4" : ""}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Hide Spoiler Images</span>
              <button
                onClick={() => setHideSpoilerImage(!hideSpoilerImage)}
                className={`w-9 h-5 rounded-full transition-colors relative ${hideSpoilerImage ? "bg-blue-600" : "bg-neutral-700"}`}
              >
                <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 left-0.75 transition-transform ${hideSpoilerImage ? "translate-x-4" : ""}`} />
              </button>
            </div>

            {/* Gemini API Key */}
            <div className="flex flex-col gap-2 border-t border-neutral-800 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">✨ Gemini AI API Key</span>
                <span className="text-[9px] text-neutral-550 font-mono">Stored locally</span>
              </div>
              <input
                type="password"
                placeholder="Enter Gemini API key"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  localStorage.setItem("gemini_api_key", e.target.value);
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>
        )}
      </div>
 
      {/* Bottom Control Bar */}
      <footer className="flex flex-col gap-2.5 px-6 py-3 border-t select-none z-30 bg-inherit">
        
        {/* Navigation buttons + Scroll progress slider */}
        <div className="flex items-center gap-6">
          
          {/* Prev Chapter */}
          <button
            onClick={handlePrevPage}
            disabled={currentChapterIndex === 0 && currentPageIndex === 0}
            className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800/30 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Previous Page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
 
          {/* Book progress track */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-[10px] text-neutral-500 font-mono select-none">
              Chapter {currentChapterIndex + 1} of {chapters.length} 
              {viewMode === "paginated" && ` • Page ${currentPageIndex + 1} of ${totalPages}`}
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
            onClick={handleNextPage}
            disabled={currentChapterIndex === chapters.length - 1 && currentPageIndex === totalPages - 1}
            className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800/30 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Next Page"
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
          height: 100%;
          text-align: justify;
          color: inherit;
          word-break: break-all;
          overflow-wrap: break-word;
          column-fill: auto;
          box-sizing: border-box;
        }

        .vertical-content-wrapper.hide-furigana rt {
          display: none !important;
        }

        .vertical-content-wrapper.hide-spoiler-image img {
          filter: blur(16px);
          transition: filter 0.3s ease;
        }
        .vertical-content-wrapper.hide-spoiler-image img:hover {
          filter: none;
        }

        .vertical-content-wrapper p {
          margin: 0;
          padding-block-end: 0.8em;
          line-height: inherit;
          orphans: 2;
          widows: 2;
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
          margin: 0;
          padding-block-end: 1.5em;
          text-indent: 0;
          display: block;
          break-after: avoid;
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
