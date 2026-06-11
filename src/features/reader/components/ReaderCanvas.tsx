import React, { useState, useEffect, useRef } from "react";
import { Book, ReaderSettings, Chapter } from "../types";
import { getChapterContent, normalizePath } from "../utils/epubParser";
import { SidebarDrawer } from "./SidebarDrawer";
import JSZip from "jszip";

interface ReaderCanvasProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (bookId: string, chapterIndex: number, columnIndex: number, progressPercent: number) => void;
  settings: ReaderSettings;
  onUpdateSettings: (settings: ReaderSettings) => void;
}

export const ReaderCanvas: React.FC<ReaderCanvasProps> = ({
  book,
  onClose,
  onUpdateProgress,
  settings,
  onUpdateSettings,
}) => {
  // Loading & Chapter States
  const [chapters, setChapters] = useState<Omit<Chapter, "content">[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(book.currentChapterIndex);
  const [chapterContentHtml, setChapterContentHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  // Pagination Layout States
  const [currentPageIndex, setCurrentPageIndex] = useState(book.currentColumnIndex || 0);
  const [totalPages, setTotalPages] = useState(1);
  const [canvasWidth, setCanvasWidth] = useState(0);

  // Sidebar Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"toc" | "styling" | "search">("toc");

  // Controls Visibility (Premium Rework)
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringControlsRef = useRef(false);

  useEffect(() => {
    if (isSidebarOpen) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      return;
    }

    const resetControlsTimer = () => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

      if (isHoveringControlsRef.current) return;

      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    };

    const handleMouseMoveGlobal = () => {
      resetControlsTimer();
    };

    window.addEventListener("mousemove", handleMouseMoveGlobal);
    resetControlsTimer();

    return () => {
      window.removeEventListener("mousemove", handleMouseMoveGlobal);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isSidebarOpen]);

  // Highlights have been removed

  // Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isManualScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);
  const zipRef = useRef<JSZip | null>(null);
  const opfPathRef = useRef<string>("content.opf");


  // Set attribute to notify wrapper/CSS that book reader is active/open
  useEffect(() => {
    document.documentElement.setAttribute("data-book-reading", "true");
    return () => {
      document.documentElement.removeAttribute("data-book-reading");
    };
  }, []);

  // Load Book Chapters Spine structure
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const { parseEpubMetadata, parseTxtBook } = await import("../utils/epubParser");
        if (book.fileType === "epub") {
          const zip = await JSZip.loadAsync(book.fileData);
          zipRef.current = zip;

          const meta = await parseEpubMetadata(book.fileData, zip);
          setChapters(meta.chapters);
          if (meta.opfPath) {
            opfPathRef.current = meta.opfPath;
          }
        } else {
          // For TXT, it is parsed and generated in one go
          const parsed = await parseTxtBook(book.fileData, book.title);
          // Set simulated chapters
          setChapters(parsed.chapters.map(c => ({ id: c.id, title: c.title, href: c.href, chapterIndex: c.chapterIndex })));
        }
      } catch (err) {
        console.error("Failed to load book spine:", err);
      }
    };
    loadChapters();
  }, [book.id]);

  // Load active chapter HTML
  useEffect(() => {
    const loadChapter = async () => {
      if (chapters.length === 0) return;
      setIsLoading(true);
      
      // Revoke previous chapter Object URLs to prevent memory leaks
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      setObjectUrls([]);

      try {
        const activeChapterMeta = chapters.find(c => c.chapterIndex === currentChapterIndex) || chapters[0];
        setCurrentChapterIndex(activeChapterMeta.chapterIndex);

        if (book.fileType === "epub") {
          const { getChapterContent } = await import("../utils/epubParser");
          
          let zip = zipRef.current;
          if (!zip) {
            zip = await JSZip.loadAsync(book.fileData);
            zipRef.current = zip;
          }
          
          let opfPath = opfPathRef.current;
          if (!opfPath || opfPath === "content.opf") {
            const containerXml = await zip.file("META-INF/container.xml")?.async("text");
            const parser = new DOMParser();
            const containerDoc = parser.parseFromString(containerXml || "", "text/xml");
            opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path") || "content.opf";
            opfPathRef.current = opfPath;
          }

          const result = await getChapterContent(zip, opfPath, activeChapterMeta.href);
          setChapterContentHtml(result.processedHtml);
          setObjectUrls(result.objectUrls);
        } else {
          // TXT file parsing
          const { parseTxtBook } = await import("../utils/epubParser");
          const parsed = await parseTxtBook(book.fileData, book.title);
          const activeCh = parsed.chapters.find(c => c.chapterIndex === currentChapterIndex) || parsed.chapters[0];
          setChapterContentHtml(activeCh.content);
        }

        // Reset page position to 0 or restoring from saved metadata
        // If it's the target chapter of the book's progress, we restore page index
        if (currentChapterIndex === book.currentChapterIndex && book.currentColumnIndex !== undefined) {
          setCurrentPageIndex(book.currentColumnIndex);
        } else {
          setCurrentPageIndex(0);
        }
      } catch (err) {
        console.error("Failed to load chapter content:", err);
        setChapterContentHtml("<p class='text-red-500 italic p-6'>Failed to parse chapter content.</p>");
      } finally {
        setIsLoading(false);
      }
    };

    loadChapter();

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [chapters, currentChapterIndex]);

  // Recalculate Page Counts
  const recalculatePages = () => {
    if (!canvasContainerRef.current || !canvasRef.current) return;
    const clientW = canvasContainerRef.current.clientWidth;
    setCanvasWidth(clientW);

    requestAnimationFrame(() => {
      if (!canvasRef.current || !canvasContainerRef.current) return;
      
      if (settings.writingMode === "vertical") {
        const scrollW = canvasRef.current.scrollWidth;
        const clientW = canvasContainerRef.current.clientWidth;
        const gap = 40; // matching column-gap
        const total = Math.round((scrollW + gap) / (clientW + gap)) || 1;
        setTotalPages(total);
        setCurrentPageIndex((prev) => Math.max(0, Math.min(total - 1, prev)));
      } else {
        const scrollH = canvasContainerRef.current.scrollHeight;
        const clientH = canvasContainerRef.current.clientHeight;
        const total = Math.ceil(scrollH / clientH) || 1;
        setTotalPages(total);
        setCurrentPageIndex((prev) => Math.max(0, Math.min(total - 1, prev)));
      }
    });
  };

  useEffect(() => {
    if (isLoading) return;
    recalculatePages();
    
    // Add resize listener
    window.addEventListener("resize", recalculatePages);
    return () => window.removeEventListener("resize", recalculatePages);
  }, [isLoading, chapterContentHtml, settings.fontSize, settings.lineHeight, settings.fontFamily, settings.writingMode, settings.columnsCount, settings.marginSize]);

  // Highlights have been removed

  // Track if a chapter was just loaded to suppress smooth scrolling
  const justLoadedRef = useRef(true);

  // Mark chapter load event
  useEffect(() => {
    justLoadedRef.current = true;
  }, [currentChapterIndex]);

  // Scroll handler to sync currentPageIndex from scroll position
  const handleScroll = () => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // Mark that the user is manually scrolling
    isManualScrollRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScrollRef.current = false;
    }, 150);

    if (settings.writingMode === "vertical") {
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const gap = 40;

      const total = Math.round((scrollWidth + gap) / (clientWidth + gap)) || 1;
      setTotalPages(total);

      const offset = Math.abs(scrollLeft);
      const newPageIdx = Math.max(
        0,
        Math.min(total - 1, Math.round(offset / (clientWidth + gap)))
      );

      if (newPageIdx !== currentPageIndex) {
        setCurrentPageIndex(newPageIdx);
      }
    } else {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      const total = Math.ceil(scrollHeight / clientHeight) || 1;
      setTotalPages(total);

      const newPageIdx = Math.max(
        0,
        Math.min(total - 1, Math.round(scrollTop / clientHeight))
      );

      if (newPageIdx !== currentPageIndex) {
        setCurrentPageIndex(newPageIdx);
      }
    }
  };

  // Sync Reading progress to DB when page turns
  useEffect(() => {
    if (isLoading || chapters.length === 0) return;
    const progressPercent = Math.round(((currentChapterIndex + (currentPageIndex / totalPages)) / chapters.length) * 100);
    onUpdateProgress(book.id, currentChapterIndex, currentPageIndex, progressPercent);
  }, [currentPageIndex, currentChapterIndex, totalPages, isLoading, chapters]);

  // Sync scroll position when currentPageIndex is changed externally (slider, bookmark, etc.)
  useEffect(() => {
    if (isLoading) return;
    const container = canvasContainerRef.current;
    if (!container) return;

    // If the change was triggered by a manual scroll, don't override the user's scroll position
    if (isManualScrollRef.current) return;

    if (settings.writingMode === "vertical") {
      const clientW = container.clientWidth;
      const gap = 40;
      const pageW = clientW + gap;
      const targetScrollLeft = -currentPageIndex * pageW;

      if (Math.abs(container.scrollLeft - targetScrollLeft) > 5) {
        container.scrollTo({
          left: targetScrollLeft,
          behavior: justLoadedRef.current ? "auto" : "smooth"
        });
      }
    } else {
      const clientH = container.clientHeight;
      const targetScrollTop = currentPageIndex * clientH;

      if (Math.abs(container.scrollTop - targetScrollTop) > 5) {
        container.scrollTo({
          top: targetScrollTop,
          behavior: justLoadedRef.current ? "auto" : "smooth"
        });
      }
    }
    justLoadedRef.current = false;
  }, [currentPageIndex, settings.writingMode, isLoading]);

  // Page Navigation handlers (scroll by page)
  const handleNextPage = () => {
    const container = canvasContainerRef.current;
    if (!container) return;

    if (settings.writingMode === "vertical") {
      const clientW = container.clientWidth;
      const gap = 40;
      const step = clientW + gap;
      const currentScroll = Math.abs(container.scrollLeft);
      const maxScroll = container.scrollWidth - clientW;

      if (currentScroll < maxScroll - 10) {
        container.scrollBy({ left: -step, behavior: "smooth" });
      } else {
        if (currentChapterIndex < chapters.length - 1) {
          setCurrentChapterIndex(prev => prev + 1);
          setCurrentPageIndex(0);
        }
      }
    } else {
      const clientH = container.clientHeight;
      const currentScroll = container.scrollTop;
      const maxScroll = container.scrollHeight - clientH;

      if (currentScroll < maxScroll - 10) {
        container.scrollBy({ top: clientH, behavior: "smooth" });
      } else {
        if (currentChapterIndex < chapters.length - 1) {
          setCurrentChapterIndex(prev => prev + 1);
          setCurrentPageIndex(0);
        }
      }
    }
  };

  const handlePrevPage = () => {
    const container = canvasContainerRef.current;
    if (!container) return;

    if (settings.writingMode === "vertical") {
      const clientW = container.clientWidth;
      const gap = 40;
      const step = clientW + gap;
      const currentScroll = Math.abs(container.scrollLeft);

      if (currentScroll > 10) {
        container.scrollBy({ left: step, behavior: "smooth" });
      } else {
        if (currentChapterIndex > 0) {
          setCurrentChapterIndex(prev => prev - 1);
          setCurrentPageIndex(9999);
        }
      }
    } else {
      const clientH = container.clientHeight;
      const currentScroll = container.scrollTop;

      if (currentScroll > 10) {
        container.scrollBy({ top: -clientH, behavior: "smooth" });
      } else {
        if (currentChapterIndex > 0) {
          setCurrentChapterIndex(prev => prev - 1);
          setCurrentPageIndex(9999);
        }
      }
    }
  };

  // Keyboard Navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in search input, don't capture
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const container = canvasContainerRef.current;
      if (!container) return;

      const scrollStep = 300; // Comfortable scroll step in pixels

      if (settings.writingMode === "vertical") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const currentScroll = Math.abs(container.scrollLeft);
          if (currentScroll <= 5) {
            if (currentChapterIndex > 0) {
              setCurrentChapterIndex(prev => prev - 1);
              setCurrentPageIndex(9999);
            }
          } else {
            container.scrollBy({ left: scrollStep, behavior: "smooth" });
          }
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          const maxScroll = container.scrollWidth - container.clientWidth;
          const currentScroll = Math.abs(container.scrollLeft);
          if (currentScroll >= maxScroll - 5) {
            if (currentChapterIndex < chapters.length - 1) {
              setCurrentChapterIndex(prev => prev + 1);
              setCurrentPageIndex(0);
            }
          } else {
            container.scrollBy({ left: -scrollStep, behavior: "smooth" });
          }
        }
      } else {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          const maxScroll = container.scrollHeight - container.clientHeight;
          const currentScroll = container.scrollTop;
          if (currentScroll >= maxScroll - 5) {
            if (currentChapterIndex < chapters.length - 1) {
              setCurrentChapterIndex(prev => prev + 1);
              setCurrentPageIndex(0);
            }
          } else {
            container.scrollBy({ top: scrollStep, behavior: "smooth" });
          }
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          const currentScroll = container.scrollTop;
          if (currentScroll <= 5) {
            if (currentChapterIndex > 0) {
              setCurrentChapterIndex(prev => prev - 1);
              setCurrentPageIndex(9999);
            }
          } else {
            container.scrollBy({ top: -scrollStep, behavior: "smooth" });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, settings.writingMode, currentChapterIndex, chapters.length]);

  // Scroll wheel mapping and chapter transition boundary helper
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container || isLoading) return;

    const handleWheel = (e: WheelEvent) => {
      if (isLoading) return;

      if (settings.writingMode === "vertical") {
        if (e.deltaY !== 0) {
          const maxScroll = container.scrollWidth - container.clientWidth;
          const currentScroll = Math.abs(container.scrollLeft);

          if (e.deltaY > 0) {
            // Scrolling forward (left)
            if (currentScroll >= maxScroll - 5) {
              e.preventDefault();
              if (currentChapterIndex < chapters.length - 1) {
                setCurrentChapterIndex(prev => prev + 1);
                setCurrentPageIndex(0);
              }
            } else {
              e.preventDefault();
              container.scrollLeft -= e.deltaY;
            }
          } else if (e.deltaY < 0) {
            // Scrolling backward (right)
            if (currentScroll <= 5) {
              e.preventDefault();
              if (currentChapterIndex > 0) {
                setCurrentChapterIndex(prev => prev - 1);
                setCurrentPageIndex(9999);
              }
            } else {
              e.preventDefault();
              container.scrollLeft -= e.deltaY;
            }
          }
        }
      } else {
        if (e.deltaY !== 0) {
          const maxScroll = container.scrollHeight - container.clientHeight;
          const currentScroll = container.scrollTop;

          if (e.deltaY > 0) {
            // Scrolling down
            if (currentScroll >= maxScroll - 5) {
              e.preventDefault();
              if (currentChapterIndex < chapters.length - 1) {
                setCurrentChapterIndex(prev => prev + 1);
                setCurrentPageIndex(0);
              }
            }
          } else if (e.deltaY < 0) {
            // Scrolling up
            if (currentScroll <= 5) {
              e.preventDefault();
              if (currentChapterIndex > 0) {
                setCurrentChapterIndex(prev => prev - 1);
                setCurrentPageIndex(9999);
              }
            }
          }
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [settings.writingMode, isLoading, currentChapterIndex, chapters.length]);

  // Full-Text Book Search
  const handleBookSearch = async (query: string) => {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(book.fileData);
    
    // Extract OPF Path
    const containerXml = await zip.file("META-INF/container.xml")?.async("text");
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml || "", "text/xml");
    const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path") || "content.opf";
    const opfDirectory = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

    const results: { chapterIndex: number; snippet: string; textOffset: number }[] = [];

    // Search through all chapters
    for (const ch of chapters) {
      let content = "";
      if (book.fileType === "epub") {
        const fullChPath = normalizePath(opfDirectory + ch.href);
        const file = zip.file(fullChPath);
        if (file) {
          const rawHtml = await file.async("text");
          const chDoc = parser.parseFromString(rawHtml, "text/html");
          content = chDoc.body ? chDoc.body.textContent || "" : chDoc.documentElement.textContent || "";
        }
      } else {
        const { parseTxtBook } = await import("../utils/epubParser");
        const parsed = await parseTxtBook(book.fileData, book.title);
        const activeCh = parsed.chapters.find(c => c.chapterIndex === ch.chapterIndex);
        if (activeCh) {
          // Plain text content (strip any HTML formatting we injected)
          content = activeCh.content.replace(/<\/?[^>]+(>|$)/g, "");
        }
      }

      // Perform matching
      let index = content.indexOf(query);
      while (index !== -1) {
        // Extract a snippet of 40 characters surrounding the match
        const start = Math.max(0, index - 20);
        const end = Math.min(content.length, index + query.length + 20);
        const snippetText = content.substring(start, end);
        
        // Highlight query word in snippet using bold tag
        const highlightedSnippet = snippetText.replace(
          query,
          `<span class="text-blue-400 font-bold bg-blue-500/10 px-1 rounded">${query}</span>`
        );

        results.push({
          chapterIndex: ch.chapterIndex,
          snippet: `…${highlightedSnippet}…`,
          textOffset: index,
        });

        // Search for next occurrence
        index = content.indexOf(query, index + 1);
        if (results.length > 50) break; // Limit search results to avoid freezing UI
      }
      if (results.length > 50) break;
    }

    return results;
  };

  const handleNavigateToSearchResult = (chapterIndex: number, textOffset: number) => {
    setCurrentChapterIndex(chapterIndex);
    // Since page calculation happens asynchronously after rendering,
    // we set page index to 0 first and will let the user navigate
    // or estimate page by textOffset.
    // To keep it simple and stable, we jump to that chapter:
    setCurrentPageIndex(0);
    setIsSidebarOpen(false);
  };

  // Helper to resolve margins
  const getMarginStyle = () => {
    if (settings.writingMode === "vertical") {
      return "pt-24 pb-20 px-16"; // Room for absolute overlays
    }
    switch (settings.marginSize) {
      case "compact":
        return "px-6 pt-20 pb-24";
      case "wide":
        return "px-20 pt-24 pb-28";
      default:
        return "px-12 pt-20 pb-24";
    }
  };

  // Helper to resolve fonts
  const getFontClass = () => {
    switch (settings.fontFamily) {
      case "serif":
        return "font-serif";
      case "sans":
        return "font-sans";
      default:
        return "font-mono";
    }
  };

  // Theme theme layout colors
  const getThemeClasses = () => {
    switch (settings.theme) {
      case "light":
        return "bg-[#fafafa] text-neutral-800";
      case "sepia":
        return "bg-[#f8f1e3] text-[#42301c]";
      case "dark":
        return "bg-[#121212] text-neutral-350";
      case "midnight":
        return "bg-[#080a10] text-[#cbd5e1]";
      case "forest":
        return "bg-[#111916] text-[#cbe0d5]";
      default:
        return "bg-[#121212] text-neutral-300";
    }
  };

  // Glassmorphic panel theme style resolver
  const getPanelThemeClasses = () => {
    switch (settings.theme) {
      case "light":
        return "bg-white/80 border-neutral-200 text-neutral-800 backdrop-blur-md shadow-lg";
      case "sepia":
        return "bg-[#f8f1e3]/85 border-[#42301c]/20 text-[#42301c] backdrop-blur-md shadow-lg";
      case "dark":
        return "bg-neutral-900/80 border-neutral-800/80 text-neutral-200 backdrop-blur-md shadow-2xl shadow-black/40";
      case "midnight":
        return "bg-[#080a10]/85 border-neutral-850/80 text-[#cbd5e1] backdrop-blur-md shadow-2xl shadow-black/40";
      case "forest":
        return "bg-[#111916]/85 border-emerald-950/80 text-[#cbe0d5] backdrop-blur-md shadow-2xl shadow-black/40";
      default:
        return "bg-neutral-900/80 border-neutral-800/80 text-neutral-200 backdrop-blur-md shadow-2xl shadow-black/40";
    }
  };



  const isVertical = settings.writingMode === "vertical";

  return (
    <div className={`flex-1 flex flex-col h-screen w-screen overflow-hidden relative select-text ${getThemeClasses()}`}>
      
      {/* Top Header navbar */}
      <header
        onMouseEnter={() => { isHoveringControlsRef.current = true; }}
        onMouseLeave={() => { isHoveringControlsRef.current = false; }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 border rounded-2xl px-6 py-3 flex items-center justify-between transition-all duration-500 ease-in-out ${getPanelThemeClasses()} ${
          controlsVisible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-current/10 hover:bg-current/5 transition flex items-center justify-center cursor-pointer text-current"
            title="Back to Library"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-xs truncate max-w-[200px] md:max-w-[320px] text-current">
              {book.title}
            </h1>
            <span className="text-[10px] opacity-60 truncate">
              {chapters.find(c => c.chapterIndex === currentChapterIndex)?.title || "Chapter " + (currentChapterIndex + 1)}
            </span>
          </div>
        </div>

        {/* Action Panel icons */}
        <div className="flex items-center gap-2">


          {/* Collapsible drawers togglers */}
          {[
            { id: "toc", label: "Index", icon: "📑" },
            { id: "styling", label: "Style", icon: "🎨" },
            { id: "search", label: "Search", icon: "🔍" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (isSidebarOpen && activeSidebarTab === item.id) {
                  setIsSidebarOpen(false);
                } else {
                  setActiveSidebarTab(item.id as any);
                  setIsSidebarOpen(true);
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-medium transition cursor-pointer flex items-center gap-1.5 ${
                isSidebarOpen && activeSidebarTab === item.id
                  ? "bg-blue-600/15 border-blue-500/40 text-blue-400 font-bold"
                  : "border-current/10 hover:bg-current/5 text-current/85"
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Reading Canvas Box */}
      <div className={isVertical ? "absolute inset-0 w-screen h-screen z-10 flex overflow-hidden" : "flex-1 flex overflow-hidden relative"}>
        
        {/* Left Page Turn Click Region */}
        <div
          onClick={isVertical ? handleNextPage : handlePrevPage}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-[80%] z-30 flex items-center justify-center opacity-0 hover:opacity-100 hover:bg-current/2 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full border border-current/10 flex items-center justify-center bg-current/5 text-current/80 group-hover:scale-110 transition shrink-0 select-none">
            &larr;
          </div>
        </div>

        {/* Text Canvas Container */}
        <div
          ref={canvasContainerRef}
          onScroll={handleScroll}
          style={{
            writingMode: settings.writingMode === "vertical" ? "vertical-rl" : "horizontal-tb",
          }}
          className={`flex-1 scroll-smooth no-scrollbar relative h-full ${
            settings.writingMode === "vertical" ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto overflow-x-hidden"
          } ${getMarginStyle()}`}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-500 gap-2">
              <div className="w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
              <span className="text-xs font-mono font-semibold">Unpacking chapter content...</span>
            </div>
          ) : (
            <>
              <div
                ref={canvasRef}
                id="reader-content-area"
                style={{
                  // Set CSS columns count / width ONLY in vertical mode
                  columnWidth: settings.writingMode === "vertical"
                    ? (settings.columnsCount === "auto" ? "auto" : (settings.columnsCount === 1 ? "100%" : "calc(50% - 20px)"))
                    : "auto",
                  columnGap: settings.writingMode === "vertical" ? "40px" : "0px",
                  columnFill: settings.writingMode === "vertical" ? "auto" : "balance",
                  height: settings.writingMode === "vertical" ? "100%" : "auto",
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  writingMode: settings.writingMode === "vertical" ? "vertical-rl" : "horizontal-tb",
                }}
                className={`text-justify select-text break-words pr-2 ${getFontClass()} ${
                  settings.writingMode === "vertical" ? "vertical-rl" : ""
                }`}
                dangerouslySetInnerHTML={{ __html: chapterContentHtml }}
              />
              <style>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                .no-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
                #reader-content-area img,
                #reader-content-area svg,
                #reader-content-area image {
                  max-width: 100% !important;
                  max-height: 100% !important;
                  object-fit: contain !important;
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  display: block !important;
                  margin: auto !important;
                }
                /* CSS Custom Highlight API styling for temporary highlight preview */
                ::highlight(reader-temp-highlight) {
                  background-color: rgba(59, 130, 246, 0.25);
                  color: inherit;
                }
                /* Native selection fallback styling */
                #reader-content-area ::selection {
                  background-color: rgba(59, 130, 246, 0.3);
                  color: inherit;
                }
              `}</style>
            </>
          )}
        </div>

        {/* Right Page Turn Click Region */}
        <div
          onClick={isVertical ? handlePrevPage : handleNextPage}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-[80%] z-30 flex items-center justify-center opacity-0 hover:opacity-100 hover:bg-current/2 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full border border-current/10 flex items-center justify-center bg-current/5 text-current/80 group-hover:scale-110 transition shrink-0 select-none">
            &rarr;
          </div>
        </div>

      </div>

      {/* Bottom Footer Page Control Scrubber */}
      <footer
        onMouseEnter={() => { isHoveringControlsRef.current = true; }}
        onMouseLeave={() => { isHoveringControlsRef.current = false; }}
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 border rounded-2xl px-6 py-3 flex flex-col gap-2 transition-all duration-500 ease-in-out text-[11px] font-mono ${getPanelThemeClasses()} ${
          controlsVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5 select-none">
            <button
              onClick={handlePrevPage}
              className="px-1.5 py-0.5 rounded hover:bg-current/5 text-current cursor-pointer"
            >
              ◀ Prev
            </button>
            <span className="text-current font-semibold">
              Page {currentPageIndex + 1} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              className="px-1.5 py-0.5 rounded hover:bg-current/5 text-current cursor-pointer"
            >
              Next ▶
            </button>
          </div>

          {/* Scrubber slider */}
          <div className="flex-1 max-w-[400px] flex items-center gap-2 select-none">
            <input
              type="range"
              dir="rtl"
              min="0"
              max={totalPages - 1 || 0}
              step="1"
              value={currentPageIndex}
              onChange={(e) => setCurrentPageIndex(parseInt(e.target.value))}
              className="flex-1 accent-blue-500 h-1 rounded bg-current/10 cursor-pointer"
            />
          </div>

          <div className="text-right text-[9px] text-current">
            <span>Book progress: {book.currentProgress || 0}% read</span>
          </div>
        </div>
      </footer>

      {/* Side collapsible drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeSidebarTab}
        setActiveTab={setActiveSidebarTab}
        book={book}
        chapters={chapters}
        currentChapterIndex={currentChapterIndex}
        onSelectChapter={(idx) => {
          setCurrentChapterIndex(idx);
          setCurrentPageIndex(0);
        }}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onSearch={handleBookSearch}
        onNavigateToSearchResult={handleNavigateToSearchResult}
      />
    </div>
  );
};
