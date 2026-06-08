"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface DictionaryEntry {
  expression: string;
  reading: string;
  definitionTags: string[];
  rules: string[];
  popularity: number | null;
  definition: any[];
  sequence: number | null;
  matchedText: string;
  matchedLength: number;
}

export const DictionaryPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Position of the popup
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [popupHeight, setPopupHeight] = useState(0);
  
  // Navigation stack for cross-references
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // Ref to track mouse position
  const mouseCoords = useRef({ x: 0, y: 0 });
  
  // Refs for tracking DOM selection highlight
  const activeRangeRef = useRef<{
    node: Node;
    offset: number;
    length: number;
  } | null>(null);
  
  const popupRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Initialize portal target and listen to fullscreen changes
  useEffect(() => {
    setPortalTarget(document.body);

    const handleFullscreenChange = () => {
      setPortalTarget((document.fullscreenElement as HTMLElement) || document.body);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Monitor mouse movements to get the coordinates of the cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseCoords.current = { x: e.clientX, y: e.clientY };
    };
    
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Listen to KeyDown to trigger lookup on Shift press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        // If the popup is already open and we press Shift, do we query again?
        // Yes, Yomichan lets you search another word if you press Shift while hovering it
        triggerLookup();
      } else if (e.key === "Escape") {
        closePopup();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Click outside listener to close popup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen && 
        popupRef.current && 
        !popupRef.current.contains(e.target as Node)
      ) {
        closePopup();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Read viewport height when size changes
  useEffect(() => {
    if (popupRef.current) {
      setPopupHeight(popupRef.current.offsetHeight);
    }
  }, [entries, loading]);

  const triggerLookup = async (manualText?: string) => {
    let textToLookup = "";
    let targetNode: Node | null = null;
    let targetOffset = 0;

    // Detect if we should use dark mode
    const { x, y } = mouseCoords.current;
    const hoveredElem = document.elementFromPoint(x, y);
    const hasDarkAncestor = hoveredElem ? !!hoveredElem.closest(".dark") : false;
    const isPageDark = document.documentElement.classList.contains("dark") || 
                       document.body.classList.contains("dark") ||
                       (typeof window !== "undefined" && window.location.pathname.includes("video-player"));
    setIsDark(hasDarkAncestor || isPageDark);

    if (manualText) {
      textToLookup = manualText;
    } else {
      const elem = hoveredElem;
      if (elem && (
        elem.closest(".no-lookup") || 
        elem.closest("button") || 
        elem.closest("input") || 
        elem.closest("textarea")
      )) {
        return; // Ignore lookup on inputs/buttons/no-lookup zones
      }

      // Find the character under the mouse cursor
      let range: Range | null = null;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      } else if ((document as any).caretPositionFromPoint) {
        const pos = (document as any).caretPositionFromPoint(x, y);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.setEnd(pos.offsetNode, pos.offset);
        }
      }

      if (!range) return;

      const node = range.startContainer;
      const offset = range.startOffset;

      if (node.nodeType !== Node.TEXT_NODE) return;

      const textContent = node.textContent || "";
      const textFromCursor = textContent.substring(offset).trim();

      // Ignore if no text or if it doesn't look like Japanese/content (basic whitespace/punctuation check)
      if (!textFromCursor || /^[\s、。！？\.,!?()（）\-\—]+$/.test(textFromCursor)) {
        return;
      }

      textToLookup = textFromCursor;
      targetNode = node;
      targetOffset = offset;
    }

    setLoading(true);
    setError(null);
    setIsOpen(true);
    
    // Save cursor position for the popup
    if (!manualText) {
      setPosition({ x: mouseCoords.current.x, y: mouseCoords.current.y });
    }

    try {
      const res = await fetch(`/api/dictionary/lookup?text=${encodeURIComponent(textToLookup)}`);
      const data = await res.json();

      if (data.success && data.results && data.results.length > 0) {
        setEntries(data.results);
        
        // Push to search history if not manual navigation back
        if (!manualText) {
          setSearchHistory([data.results[0].expression]);
        }

        // Apply text selection highlight to the matched word in the background page
        if (targetNode && data.results[0]) {
          const matchedLen = data.results[0].matchedLength;
          highlightText(targetNode, targetOffset, matchedLen);
        }
      } else {
        setEntries([]);
        if (!manualText) {
          setError("No definitions found");
          // Clear any highlight
          clearHighlight();
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to query dictionary");
      clearHighlight();
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (node: Node, offset: number, length: number) => {
    try {
      const selection = window.getSelection();
      if (!selection) return;

      const range = document.createRange();
      range.setStart(node, offset);
      
      // Ensure we don't overflow the text node length
      const maxLen = node.textContent?.length || 0;
      range.setEnd(node, Math.min(offset + length, maxLen));

      selection.removeAllRanges();
      selection.addRange(range);

      activeRangeRef.current = { node, offset, length };
    } catch (err) {
      console.error("Failed to highlight text:", err);
    }
  };

  const clearHighlight = () => {
    if (activeRangeRef.current) {
      window.getSelection()?.removeAllRanges();
      activeRangeRef.current = null;
    }
  };

  const closePopup = () => {
    setIsOpen(false);
    setEntries([]);
    setError(null);
    setSearchHistory([]);
    clearHighlight();
  };

  const handleSearchQuery = async (queryText: string) => {
    // Add to history stack
    setSearchHistory((prev) => [...prev, queryText]);
    // Query it
    triggerLookup(queryText);
  };

  const handleGoBack = () => {
    if (searchHistory.length <= 1) return;
    const newHistory = searchHistory.slice(0, -1);
    const prevQuery = newHistory[newHistory.length - 1];
    setSearchHistory(newHistory);
    triggerLookup(prevQuery);
  };

  const handleSpeak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Structured Content Rendering
  const RenderSC: React.FC<{ content: any }> = ({ content }) => {
    if (content === null || content === undefined) return null;
    if (typeof content === "string") return <>{content}</>;
    if (Array.isArray(content)) {
      return (
        <>
          {content.map((item, index) => (
            <RenderSC key={index} content={item} />
          ))}
        </>
      );
    }
    if (typeof content === "object") {
      const tag = content.tag || "span";
      const children = content.content;
      const data = content.data || {};
      const style = content.style || {};
      const href = content.href;
      const lang = content.lang;

      let className = "";
      const classNameAttr = content.className || data.class || "";
      
      if (classNameAttr) {
        if (classNameAttr.includes("tag") || classNameAttr.includes("part-of-speech")) {
          className += " inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/30 mr-1.5 my-0.5 align-middle select-none";
        } else if (classNameAttr.includes("extra-box") || classNameAttr.includes("xref") || classNameAttr.includes("extra-info")) {
          className += " border border-neutral-200/50 dark:border-neutral-800/80 rounded-xl p-2 my-1.5 text-[11px] bg-neutral-50/50 dark:bg-neutral-900/30 leading-normal";
        } else if (classNameAttr.includes("label") || classNameAttr.includes("reference-label")) {
          className += " text-xs font-semibold text-neutral-400 dark:text-neutral-500 mr-1";
        }
      }

      const props: any = { style, className };
      if (lang) props.lang = lang;

      switch (tag) {
        case "br":
          return <br />;
        case "ruby":
          return <ruby className="ruby-text"><RenderSC content={children} /></ruby>;
        case "rt":
          return <rt className="text-[10px] text-neutral-400 dark:text-neutral-500 select-none font-sans font-normal leading-none"><RenderSC content={children} /></rt>;
        case "a":
          if (href && href.startsWith("?query=")) {
            const queryVal = decodeURIComponent(href.split("query=")[1].split("&")[0]);
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSearchQuery(queryVal);
                }}
                className="text-blue-500 dark:text-blue-400 hover:underline inline font-medium cursor-pointer"
              >
                <RenderSC content={children} />
              </button>
            );
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">
              <RenderSC content={children} />
            </a>
          );
        case "ul":
          return <ul className="list-disc pl-4 space-y-1.5 my-1.5 text-neutral-600 dark:text-neutral-300"><RenderSC content={children} /></ul>;
        case "ol":
          return <ol className="list-decimal pl-4 space-y-1.5 my-1.5 text-neutral-600 dark:text-neutral-300"><RenderSC content={children} /></ol>;
        case "li":
          return <li className="leading-relaxed"><RenderSC content={children} /></li>;
        case "table": {
          const hasTableSections = Array.isArray(children)
            ? children.some(c => c && typeof c === "object" && (c.tag === "thead" || c.tag === "tbody" || c.tag === "tfoot"))
            : (children && typeof children === "object" && (children.tag === "thead" || children.tag === "tbody" || children.tag === "tfoot"));
          return (
            <table className="w-full text-xs border-collapse border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden my-2">
              {hasTableSections ? (
                <RenderSC content={children} />
              ) : (
                <tbody>
                  <RenderSC content={children} />
                </tbody>
              )}
            </table>
          );
        }
        case "thead":
          return <thead className="bg-neutral-50 dark:bg-neutral-900"><RenderSC content={children} /></thead>;
        case "tbody":
          return <tbody><RenderSC content={children} /></tbody>;
        case "tr":
          return <tr className="border-b border-neutral-100 dark:border-neutral-900/60"><RenderSC content={children} /></tr>;
        case "th":
          return <th className="px-2 py-1 text-left font-semibold text-neutral-500 dark:text-neutral-400"><RenderSC content={children} /></th>;
        case "td":
          return <td className="px-2 py-1 text-neutral-600 dark:text-neutral-300"><RenderSC content={children} /></td>;
        case "div":
          return <div {...props}><RenderSC content={children} /></div>;
        case "span":
        default:
          return <span {...props}><RenderSC content={children} /></span>;
      }
    }
    return null;
  };

  if (!isOpen || !portalTarget) return null;

  // Calculate coordinates to prevent popup clipping at screen edges
  const width = 450;
  const heightEstimate = popupHeight || 300;
  
  let left = position.x + 15;
  let top = position.y + 15;

  // Prevent right edge overflow
  if (left + width > window.innerWidth) {
    left = window.innerWidth - width - 15;
  }
  // If too close to left
  if (left < 10) left = 10;

  // Prevent bottom edge overflow - render above cursor instead
  if (top + heightEstimate > window.innerHeight) {
    top = position.y - heightEstimate - 15;
  }
  // If too close to top
  if (top < 10) top = 10;

  return createPortal(
    <div
      ref={popupRef}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
      }}
      className={`fixed z-[9999] flex flex-col max-h-[380px] rounded-2xl border border-neutral-200/60 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 no-lookup overflow-hidden select-text text-left text-neutral-800 dark:text-neutral-200 ${isDark ? "dark" : ""}`}
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-200/40 dark:border-neutral-800/40 select-none">
        <div className="flex items-center gap-1">
          {searchHistory.length > 1 && (
            <button
              onClick={handleGoBack}
              className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60 hover:text-neutral-800 dark:hover:text-neutral-100 transition cursor-pointer"
              title="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          )}
          <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 font-mono pl-1">
            Jitendex Dict
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {entries.length > 0 && (
            <>
              {/* Audio Reading Playback */}
              <button
                onClick={() => handleSpeak(entries[0].expression)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60 hover:text-blue-500 dark:hover:text-blue-400 transition cursor-pointer"
                title="Hear audio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              </button>

              {/* Copy Expression */}
              <button
                onClick={() => handleCopy(entries[0].expression, 9999)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60 hover:text-blue-500 dark:hover:text-blue-400 transition cursor-pointer"
                title="Copy expression"
              >
                {copiedId === 9999 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={closePopup}
            className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
            title="Close popup (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2.5">
            <div className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
            <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 font-sans tracking-wide">Searching definition...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-6 text-xs text-neutral-400 dark:text-neutral-500 font-sans">
            {error}
          </div>
        )}

        {!loading && !error && entries.map((entry, index) => (
          <div key={index} className="border-b border-neutral-100 dark:border-neutral-900/50 last:border-b-0 pb-3 last:pb-0">
            {/* Header info */}
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-xl font-bold font-serif text-neutral-950 dark:text-zinc-50 leading-none">
                {entry.expression}
              </span>
              
              {entry.reading && entry.reading !== entry.expression && (
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 font-sans leading-none">
                  【{entry.reading}】
                </span>
              )}

              {/* Popularity indicator */}
              {entry.popularity !== null && (
                <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 select-none align-middle leading-none border border-neutral-200 dark:border-neutral-800 rounded px-1">
                  #{entry.popularity}
                </span>
              )}
            </div>

            {/* Badges / Grammar tags */}
            {(entry.definitionTags.length > 0 || entry.rules.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-1.5 select-none">
                {entry.definitionTags.map((tag, tIdx) => (
                  <span key={tIdx} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-200/40 dark:border-neutral-800/40">
                    {tag}
                  </span>
                ))}
                {entry.rules.map((rule, rIdx) => (
                  <span key={rIdx} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20">
                    {rule}
                  </span>
                ))}
              </div>
            )}

            {/* Definitions (RenderStructuredContent) */}
            <div className="mt-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-sans leading-relaxed">
              <RenderSC content={entry.definition} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Styles for ruby text formatting */}
      <style jsx global>{`
        .ruby-text {
          ruby-position: over;
          ruby-align: center;
        }
        .ruby-text rt {
          user-select: none;
        }
      `}</style>
    </div>,
    portalTarget
  );
};
