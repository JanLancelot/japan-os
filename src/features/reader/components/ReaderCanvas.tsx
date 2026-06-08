import React, { useState, useEffect, useRef } from "react";
import { Book, Bookmark, Highlight, VocabularyItem, ReaderSettings, Chapter } from "../types";
import { getChapterContent, normalizePath } from "../utils/epubParser";
import { SidebarDrawer } from "./SidebarDrawer";

// Custom DOM highlighter helper
function applyHighlights(element: HTMLElement, highlights: Highlight[]) {
  if (highlights.length === 0) return;
  
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent || parent.tagName === "MARK" || parent.closest("mark")) return;

      const text = node.textContent || "";
      for (const hl of highlights) {
        if (text.includes(hl.text)) {
          const index = text.indexOf(hl.text);
          const before = text.substring(0, index);
          const match = text.substring(index, index + hl.text.length);
          const after = text.substring(index + hl.text.length);

          const beforeNode = document.createTextNode(before);
          const mark = document.createElement("mark");
          mark.className = `hl-${hl.color} cursor-pointer rounded-sm px-0.5`;
          
          const colors = {
            yellow: "rgba(234, 179, 8, 0.25)",
            pink: "rgba(236, 72, 153, 0.25)",
            blue: "rgba(59, 130, 246, 0.25)",
            green: "rgba(34, 197, 94, 0.25)"
          };
          const borderColors = {
            yellow: "rgba(234, 179, 8, 0.6)",
            pink: "rgba(236, 72, 153, 0.6)",
            blue: "rgba(59, 130, 246, 0.6)",
            green: "rgba(34, 197, 94, 0.6)"
          };
          mark.style.backgroundColor = colors[hl.color];
          mark.style.borderBottom = `2px solid ${borderColors[hl.color]}`;
          mark.style.color = "inherit";
          mark.textContent = match;
          
          if (hl.note) {
            mark.title = `Note: ${hl.note}`;
          }
          
          const afterNode = document.createTextNode(after);
          
          parent.replaceChild(afterNode, node);
          parent.insertBefore(mark, afterNode);
          parent.insertBefore(beforeNode, mark);
          
          walk(afterNode);
          break;
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName;
      if (tag !== "SCRIPT" && tag !== "STYLE" && tag !== "BUTTON" && tag !== "MARK") {
        const children = Array.from(node.childNodes);
        children.forEach(child => walk(child));
      }
    }
  };
  
  walk(element);
}

interface ReaderCanvasProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (bookId: string, chapterIndex: number, columnIndex: number, progressPercent: number) => void;
  settings: ReaderSettings;
  onUpdateSettings: (settings: ReaderSettings) => void;
  
  bookmarks: Bookmark[];
  onAddBookmark: (bm: Omit<Bookmark, "id" | "createdAt">) => void;
  onDeleteBookmark: (id: string) => void;
  
  highlights: Highlight[];
  onAddHighlight: (hl: Omit<Highlight, "id" | "createdAt">) => void;
  onDeleteHighlight: (id: string) => void;
  
  vocabulary: VocabularyItem[];
  onAddVocab: (vocab: Omit<VocabularyItem, "id" | "createdAt">) => void;
  onDeleteVocab: (id: string) => void;
}

export const ReaderCanvas: React.FC<ReaderCanvasProps> = ({
  book,
  onClose,
  onUpdateProgress,
  settings,
  onUpdateSettings,
  bookmarks,
  onAddBookmark,
  onDeleteBookmark,
  highlights,
  onAddHighlight,
  onDeleteHighlight,
  vocabulary,
  onAddVocab,
  onDeleteVocab,
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
  const [activeSidebarTab, setActiveSidebarTab] = useState<"toc" | "styling" | "search" | "bookmarks" | "vocab">("toc");



  // Text Selection Highlight Overlay States
  const [selectedText, setSelectedText] = useState("");
  const [selectionBox, setSelectionBox] = useState<{ top: number; left: number } | null>(null);
  const [highlightNote, setHighlightNote] = useState("");
  const [showHighlightForm, setShowHighlightForm] = useState(false);

  // Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastCaretOffsetRef = useRef<number | null>(null);
  const lastCaretNodeRef = useRef<Node | null>(null);
  const isManualScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  // Save saved vocabulary set for quick lookups inside popup
  const savedVocabExpressions = React.useMemo(() => {
    return new Set(vocabulary.map((v) => `${v.expression}::${v.reading || ""}`));
  }, [vocabulary]);

  // Load Book Chapters Spine structure
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const { parseEpubMetadata, parseTxtBook } = await import("../utils/epubParser");
        if (book.fileType === "epub") {
          const meta = await parseEpubMetadata(book.fileData);
          setChapters(meta.chapters);
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
          // EPUB OPF relative directory path
          const { parseEpubMetadata } = await import("../utils/epubParser");
          const meta = await parseEpubMetadata(book.fileData);
          // OPF Path: In our metadata extractor, we can store or extract OPF path.
          // Wait, let's extract the OPF path from container.xml again
          const JSZip = (await import("jszip")).default;
          const zip = await JSZip.loadAsync(book.fileData);
          const containerXml = await zip.file("META-INF/container.xml")?.async("text");
          const parser = new DOMParser();
          const containerDoc = parser.parseFromString(containerXml || "", "text/xml");
          const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path") || "content.opf";

          const result = await getChapterContent(book.fileData, opfPath, activeChapterMeta.href);
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

    // Minor delay to ensure browser has completed layout reflow
    requestAnimationFrame(() => {
      if (!canvasRef.current || !canvasContainerRef.current) return;
      const scrollW = canvasRef.current.scrollWidth;
      const clientW = canvasContainerRef.current.clientWidth;
      const gap = 40; // matching column-gap
      
      // Mathematically exact page count including column gaps
      const total = Math.round((scrollW + gap) / (clientW + gap)) || 1;
      setTotalPages(total);
      
      // Keep within boundaries
      setCurrentPageIndex((prev) => Math.max(0, Math.min(total - 1, prev)));
    });
  };

  useEffect(() => {
    if (isLoading) return;
    recalculatePages();
    
    // Add resize listener
    window.addEventListener("resize", recalculatePages);
    return () => window.removeEventListener("resize", recalculatePages);
  }, [isLoading, chapterContentHtml, settings.fontSize, settings.lineHeight, settings.fontFamily, settings.writingMode, settings.columnsCount, settings.marginSize]);

  // Inject Highlights after DOM layout finishes
  useEffect(() => {
    if (isLoading || !canvasRef.current || !chapterContentHtml) return;
    
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        applyHighlights(
          canvasRef.current,
          highlights.filter((h) => h.chapterIndex === currentChapterIndex)
        );
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoading, chapterContentHtml, highlights, currentChapterIndex]);

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

    const clientW = container.clientWidth;
    const gap = 40;
    const pageW = clientW + gap;
    const targetScrollLeft = settings.writingMode === "vertical" ? -currentPageIndex * pageW : currentPageIndex * pageW;

    if (Math.abs(container.scrollLeft - targetScrollLeft) > 5) {
      container.scrollTo({
        left: targetScrollLeft,
        behavior: justLoadedRef.current ? "auto" : "smooth"
      });
    }
    justLoadedRef.current = false;
  }, [currentPageIndex, settings.writingMode, isLoading]);

  // Page Navigation handlers (scroll by page)
  const handleNextPage = () => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const clientW = container.clientWidth;
    const gap = 40;
    const step = clientW + gap;

    const currentScroll = Math.abs(container.scrollLeft);
    const maxScroll = container.scrollWidth - clientW;

    if (currentScroll < maxScroll - 10) {
      if (settings.writingMode === "vertical") {
        container.scrollBy({ left: -step, behavior: "smooth" });
      } else {
        container.scrollBy({ left: step, behavior: "smooth" });
      }
    } else {
      // Go to next chapter
      if (currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex(prev => prev + 1);
        setCurrentPageIndex(0);
      }
    }
  };

  const handlePrevPage = () => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const clientW = container.clientWidth;
    const gap = 40;
    const step = clientW + gap;

    const currentScroll = Math.abs(container.scrollLeft);

    if (currentScroll > 10) {
      if (settings.writingMode === "vertical") {
        container.scrollBy({ left: step, behavior: "smooth" });
      } else {
        container.scrollBy({ left: -step, behavior: "smooth" });
      }
    } else {
      // Go to previous chapter
      if (currentChapterIndex > 0) {
        setCurrentChapterIndex(prev => prev - 1);
        setCurrentPageIndex(9999);
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

      const scrollStep = 300; // Comfortable horizontal scroll step in pixels

      if (e.key === "ArrowRight") {
        e.preventDefault();
        container.scrollBy({ left: scrollStep, behavior: "smooth" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        container.scrollBy({ left: -scrollStep, behavior: "smooth" });
      } else if (e.key === "Escape") {
        clearTemporaryHighlight();
        setSelectedText("");
        setSelectionBox(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading]);

  // Scroll wheel mapping helper (redirect vertical scroll wheel to horizontal)
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container || isLoading) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        if (settings.writingMode === "vertical") {
          // In vertical writing mode, next pages are to the left (negative direction).
          // Scroll down (positive deltaY) should scroll left (subtract deltaY).
          container.scrollLeft -= e.deltaY;
        } else {
          // LTR: scroll down (positive deltaY) should scroll right (add deltaY).
          container.scrollLeft += e.deltaY;
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [settings.writingMode, isLoading]);

  // Temporary highlight using CSS Custom Highlight API (or native selection fallback)
  const tempHighlightRangeRef = useRef<Range | null>(null);

  const clearTemporaryHighlight = () => {
    // Clear CSS Custom Highlight if supported
    if (typeof CSS !== "undefined" && "highlights" in CSS) {
      (CSS as any).highlights.delete("reader-temp-highlight");
    }
    tempHighlightRangeRef.current = null;
    // Also clear native selection
    window.getSelection()?.removeAllRanges();
  };

  const applyTemporaryHighlight = (selection: Selection) => {
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0).cloneRange();
    tempHighlightRangeRef.current = range;

    // Use CSS Custom Highlight API if available (Chrome 105+, Edge 105+)
    if (typeof CSS !== "undefined" && "highlights" in CSS) {
      try {
        const highlight = new (window as any).Highlight(range);
        (CSS as any).highlights.set("reader-temp-highlight", highlight);
      } catch (err) {
        // Fallback: just keep native selection visible
      }
    }
    // If CSS Custom Highlight API not available, the native ::selection stays visible as fallback
  };

  // Clear temporary highlight on chapter changes / unmount
  useEffect(() => {
    return () => {
      clearTemporaryHighlight();
    };
  }, [currentChapterIndex]);

  // Text Selection / Highlight Handler
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString().trim();
    if (text.length > 0) {
      setSelectedText(text);

      // Locate bounding rect of selected text
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Show selection popup floating above/below selection
        setSelectionBox({
          top: rect.top - 45 + window.scrollY,
          left: rect.left + rect.width / 2 - 80 + window.scrollX,
        });

        // Apply the temporary highlight (keeps native selection as fallback)
        applyTemporaryHighlight(selection);
      } catch (err) {
        console.error("Failed to calculate selection position:", err);
      }
    } else {
      // Clear selection box if clicked elsewhere, unless the highlight form is open
      if (!showHighlightForm) {
        clearTemporaryHighlight();
        setSelectedText("");
        setSelectionBox(null);
      }
    }
  };

  // Bookmark Toggle
  const isPageBookmarked = bookmarks.some(
    (bm) => bm.chapterIndex === currentChapterIndex && bm.columnIndex === currentPageIndex
  );

  const handleToggleBookmark = () => {
    if (isPageBookmarked) {
      const bm = bookmarks.find(
        (b) => b.chapterIndex === currentChapterIndex && b.columnIndex === currentPageIndex
      );
      if (bm) onDeleteBookmark(bm.id);
    } else {
      // Grab text snippet of first paragraph visible on the page
      let snippet = "";
      if (canvasRef.current) {
        // Simple extraction of first text node contents
        snippet = canvasRef.current.textContent?.trim().slice(0, 40) || "";
        if (snippet.length === 40) snippet += "…";
      }

      onAddBookmark({
        bookId: book.id,
        chapterIndex: currentChapterIndex,
        columnIndex: currentPageIndex,
        progress: currentChapterIndex + (currentPageIndex / totalPages),
        textSnippet: snippet || `Bookmark - Chapter ${currentChapterIndex + 1}, Page ${currentPageIndex + 1}`,
      });
    }
  };

  // Highlight creation helper
  const handleCreateHighlight = (color: "yellow" | "pink" | "blue" | "green") => {
    if (!selectedText) return;

    // Remove temporary highlight node so it does not conflict with permanent highlights rendering
    clearTemporaryHighlight();

    onAddHighlight({
      bookId: book.id,
      chapterIndex: currentChapterIndex,
      text: selectedText,
      color,
      note: highlightNote.trim() || undefined,
    });

    // Reset selection
    const selection = window.getSelection();
    selection?.removeAllRanges();
    setSelectedText("");
    setSelectionBox(null);
    setHighlightNote("");
    setShowHighlightForm(false);
  };

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
        return "px-6 py-4";
      case "wide":
        return "px-20 py-12";
      default:
        return "px-12 py-8";
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



  const isVertical = settings.writingMode === "vertical";

  return (
    <div className={`flex-1 flex flex-col h-screen w-screen overflow-hidden relative select-text ${getThemeClasses()}`}>
      
      {/* Top Header navbar */}
      <header className={isVertical
        ? "absolute top-0 left-0 w-full px-6 py-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 via-black/30 to-transparent border-none text-white"
        : "px-6 py-3 flex items-center justify-between border-b border-current/5 shrink-0 z-50 bg-black/5 backdrop-blur-sm"}
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
          {/* Bookmark Toggle */}
          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-center ${
              isPageBookmarked
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                : "border-current/10 hover:bg-current/5 text-current/85"
            }`}
            title={isPageBookmarked ? "Remove Bookmark" : "Add Bookmark"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isPageBookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Collapsible drawers togglers */}
          {[
            { id: "toc", label: "Index", icon: "📑" },
            { id: "styling", label: "Style", icon: "🎨" },
            { id: "search", label: "Search", icon: "🔍" },
            { id: "bookmarks", label: "Marks", icon: "🔖" },
            { id: "vocab", label: "Vocab", icon: "📓" },
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
          onMouseUp={handleMouseUp}
          onScroll={handleScroll}
          style={{
            writingMode: settings.writingMode === "vertical" ? "vertical-rl" : "horizontal-tb",
          }}
          className={`flex-1 overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar relative h-full ${getMarginStyle()}`}
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
                  // Set CSS columns count / width
                  columnWidth: settings.columnsCount === "auto"
                    ? (settings.writingMode === "vertical" ? "auto" : "calc(50% - 20px)")
                    : (settings.columnsCount === 1 ? "100%" : "calc(50% - 20px)"),
                  columnGap: "40px",
                  columnFill: "auto",
                  height: "100%",
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
      <footer className={isVertical
        ? "absolute bottom-0 left-0 w-full px-6 py-4 flex flex-col gap-2 z-50 bg-gradient-to-t from-black/80 via-black/30 to-transparent border-none text-white text-[10px] font-mono"
        : "px-6 py-2 border-t border-current/5 shrink-0 z-50 bg-black/5 text-[10px] font-mono opacity-80 flex flex-col gap-2 relative"}
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

      {/* Floating Hover Selection Highlight Tooltip Toolbar */}
      {selectedText && selectionBox && (
        <div
          style={{
            position: "fixed",
            top: `${selectionBox.top}px`,
            left: `${selectionBox.left}px`,
            zIndex: 4500,
          }}
          className="bg-neutral-900 border border-neutral-800 text-white p-2.5 rounded-xl shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Colors row */}
          {!showHighlightForm ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-400 mr-1">Highlight:</span>
              {(["yellow", "pink", "blue", "green"] as const).map((color) => {
                const colorHex = {
                  yellow: "bg-yellow-500",
                  pink: "bg-pink-500",
                  blue: "bg-blue-500",
                  green: "bg-green-500"
                };
                return (
                  <button
                    key={color}
                    onClick={() => {
                      // Save directly if no note, or open note input form
                      setShowHighlightForm(true);
                    }}
                    className={`w-4 h-4 rounded-full ${colorHex[color]} hover:scale-125 transition active:scale-95 cursor-pointer`}
                    title={`Highlight in ${color}`}
                  />
                );
              })}
              
            </div>
          ) : (
            // Add note text input form
            <div className="flex flex-col gap-2 w-[220px]">
              <textarea
                placeholder="Add annotation note (optional)..."
                value={highlightNote}
                onChange={(e) => setHighlightNote(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-white w-full h-[50px] resize-none focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowHighlightForm(false)}
                  className="text-[9px] hover:underline text-neutral-450 cursor-pointer"
                >
                  &larr; Colors
                </button>
                <div className="flex gap-1.5">
                  {(["yellow", "pink", "blue", "green"] as const).map((color) => (
                    <button
                      key={color}
                      onClick={() => handleCreateHighlight(color)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold bg-neutral-800 hover:bg-neutral-750 text-white capitalize cursor-pointer`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}



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
        bookmarks={bookmarks}
        highlights={highlights}
        onSelectBookmark={(bm) => {
          setCurrentChapterIndex(bm.chapterIndex);
          setCurrentPageIndex(bm.columnIndex);
          setIsSidebarOpen(false);
        }}
        onDeleteBookmark={onDeleteBookmark}
        onSelectHighlight={(hl) => {
          setCurrentChapterIndex(hl.chapterIndex);
          // Jump to start of chapter, and users can scroll/turn to view
          setCurrentPageIndex(0);
          setIsSidebarOpen(false);
        }}
        onDeleteHighlight={onDeleteHighlight}
        vocabulary={vocabulary}
        onDeleteVocab={onDeleteVocab}
        onSearch={handleBookSearch}
        onNavigateToSearchResult={handleNavigateToSearchResult}
      />
    </div>
  );
};
