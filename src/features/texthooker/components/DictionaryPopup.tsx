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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const imageCacheRef = useRef<Record<string, string | null>>({});
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerLookupRef = useRef<((manualText?: string) => Promise<void>) | null>(null);
  useEffect(() => {
    triggerLookupRef.current = triggerLookup;
  });

  // Gemini AI States
  const [contextSentence, setContextSentence] = useState("");
  const [prevSentences, setPrevSentences] = useState<string[]>([]);
  const [nextSentences, setNextSentences] = useState<string[]>([]);
  const [contextCountBefore, setContextCountBefore] = useState(1);
  const [contextCountAfter, setContextCountAfter] = useState(1);
  // AI mode is always "sentence"
  const aiMode = "sentence";
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [aiCache, setAiCache] = useState<Record<string, string>>({});

  // Popup page view state
  const [popupView, setPopupView] = useState<"dictionary" | "ai">("dictionary");
  const fetchImage = async (word: string) => {
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Check client-side in-memory cache first
    if (word in imageCacheRef.current) {
      setImageUrl(imageCacheRef.current[word]);
      setImageLoading(false);
      return;
    }

    setImageLoading(true);
    setImageUrl(null);

    // Debounce by 200ms to throttle fast scanning/hovering
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        const imgRes = await fetch(`/api/dictionary/image?word=${encodeURIComponent(word)}`);
        const imgData = await imgRes.json();
        const resolvedUrl = (imgData.success && imgData.imageUrl) ? imgData.imageUrl : null;
        
        imageCacheRef.current[word] = resolvedUrl;
        setImageUrl(resolvedUrl);
      } catch (err) {
        console.error("Failed to fetch image for word:", word, err);
        imageCacheRef.current[word] = null;
        setImageUrl(null);
      } finally {
        setImageLoading(false);
      }
    }, 200);
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

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

  // Synchronize Gemini API Key from localStorage when popup opens
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== "undefined") {
        setGeminiApiKey(localStorage.getItem("gemini_api_key") || "");
      }
      setAiError(null);
      setShowAiSettings(false);
    }
  }, [isOpen]);

  // Sync API Key globally across tabs/storages reactively
  useEffect(() => {
    const syncKey = () => {
      if (typeof window !== "undefined") {
        setGeminiApiKey(localStorage.getItem("gemini_api_key") || "");
      }
    };
    syncKey();
    window.addEventListener("storage", syncKey);
    return () => window.removeEventListener("storage", syncKey);
  }, []);

  // Update explanation from cache when context changes, preventing state loss
  useEffect(() => {
    if (isOpen) {
      const activePrev = prevSentences.slice(0, contextCountBefore).reverse().join("\n");
      const activeNext = nextSentences.slice(0, contextCountAfter).join("\n");
      const cacheKey = `sentence:${contextSentence}:${activePrev}:${activeNext}:${contextCountBefore}:${contextCountAfter}`;
      
      if (aiCache[cacheKey]) {
        setAiExplanation(aiCache[cacheKey]);
      } else {
        setAiExplanation(null);
      }
    }
  }, [isOpen, contextSentence, prevSentences, nextSentences, contextCountBefore, contextCountAfter, aiCache]);

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
        triggerLookupRef.current?.();
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

  const getContextData = (node: Node, offset: number, textToLookup: string) => {
    let textContainer: HTMLElement | null = node.parentElement;
    if (!textContainer) return { sentence: node.textContent || "", prevSentences: [], nextSentences: [] };

    const parentText = textContainer.textContent || "";
    const sentences = parentText.match(/[^。！？\n]+(?:[。！？\n]+|$)/g) || [parentText];
    
    let targetIdx = -1;
    const textNodeContent = node.textContent || "";
    
    // Find target sentence index
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].includes(textNodeContent)) {
        targetIdx = i;
        break;
      }
    }
    
    if (targetIdx === -1) {
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].includes(textToLookup)) {
          targetIdx = i;
          break;
        }
      }
    }
    
    if (targetIdx === -1) {
      targetIdx = 0;
    }

    const sentence = (sentences[targetIdx] || parentText).trim();
    
    // Retrieve preceding sentences
    const prevList: string[] = [];
    for (let i = targetIdx - 1; i >= 0; i--) {
      if (sentences[i]?.trim()) {
        prevList.push(sentences[i].trim());
      }
    }

    let prevSibling = textContainer.closest('.group')?.previousElementSibling || textContainer.previousElementSibling;
    while (prevSibling && prevList.length < 3) {
      const siblingText = prevSibling.textContent || "";
      const siblingSentences = siblingText.match(/[^。！？\n]+(?:[。！？\n]+|$)/g) || [];
      for (let i = siblingSentences.length - 1; i >= 0; i--) {
        if (siblingSentences[i]?.trim()) {
          prevList.push(siblingSentences[i].trim());
        }
      }
      prevSibling = prevSibling.previousElementSibling;
    }

    // Retrieve succeeding sentences
    const nextList: string[] = [];
    for (let i = targetIdx + 1; i < sentences.length; i++) {
      if (sentences[i]?.trim()) {
        nextList.push(sentences[i].trim());
      }
    }

    let nextSibling = textContainer.closest('.group')?.nextElementSibling || textContainer.nextElementSibling;
    while (nextSibling && nextList.length < 3) {
      const siblingText = nextSibling.textContent || "";
      const siblingSentences = siblingText.match(/[^。！？\n]+(?:[。！？\n]+|$)/g) || [];
      for (let i = 0; i < siblingSentences.length; i++) {
        if (siblingSentences[i]?.trim()) {
          nextList.push(siblingSentences[i].trim());
        }
      }
      nextSibling = nextSibling.nextElementSibling;
    }

    return {
      sentence,
      prevSentences: prevList.slice(0, 3),
      nextSentences: nextList.slice(0, 3)
    };
  };

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
      setContextSentence("");
      setPrevSentences([]);
      setNextSentences([]);
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

      // Extract context data
      const { sentence, prevSentences: prevs, nextSentences: nexts } = getContextData(node, offset, textToLookup);
      setContextSentence(sentence);
      setPrevSentences(prevs);
      setNextSentences(nexts);
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

        // Fetch image for the primary entry
        fetchImage(data.results[0].expression);

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
    setImageUrl(null);
    setImageLoading(false);
    setPopupView("dictionary");
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

  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key.trim());
    localStorage.setItem("gemini_api_key", key.trim());
    setShowAiSettings(false);
    setAiError(null);
  };

  const handleExplainWithAi = async () => {
    if (!geminiApiKey) {
      setAiError("Please set your Gemini API key in settings first.");
      return;
    }

    const activePrev = prevSentences.slice(0, contextCountBefore).reverse().join("\n");
    const activeNext = nextSentences.slice(0, contextCountAfter).join("\n");
    const cacheKey = `sentence:${contextSentence}:${activePrev}:${activeNext}:${contextCountBefore}:${contextCountAfter}`;

    if (aiCache[cacheKey]) {
      setAiExplanation(aiCache[cacheKey]);
      return;
    }

    setAiLoading(true);
    setAiError(null);

    const word = entries[0]?.expression || "";
    const reading = entries[0]?.reading || "";

    try {
      const prompt = `You are an expert Japanese language instructor. Explain the following sentence: "${contextSentence}".
${word ? `Focus especially on explaining the specific word/phrase "${word}"${reading ? ` (read as 【${reading}】)` : ""} in the context of this sentence.` : ""}
${activePrev ? `Preceding Context sentences:\n${activePrev}` : ""}
${activeNext ? `Succeeding Context sentences:\n${activeNext}` : ""}

Provide the following:
1. Translation: Translate and explain the entire sentence in English.
2. Word Analysis: ${word ? `Analyze the specific word/phrase "${word}", explaining its grammatical role, conjugation (if applicable), register, and nuance in this context.` : "Explain any key vocabulary."}
3. Grammar Breakdown: Break down the grammatical structure, particle usages, register/tone, and subtext/implied nuances in context of the surrounding sentences.

Format the response using markdown:
- Use bold text for Japanese words (**日本語**).
- Use bullet points for readability.
Keep it under 300 words.`;

      const endpoints = [
        `https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite-preview:generateContent?key=${geminiApiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${geminiApiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`
      ];

      let res = null;
      let lastError = "";

      for (const url of endpoints) {
        try {
          res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 600,
              }
            }),
          });

          if (res.ok) {
            break;
          } else {
            const errData = await res.json().catch(() => ({}));
            lastError = errData.error?.message || `API status ${res.status}`;
            console.warn(`Gemini endpoint failed (${url}): ${res.status}`, errData);
          }
        } catch (e: any) {
          lastError = e.message || "Network error";
          console.warn(`Fetch error for ${url}:`, e);
        }
      }

      if (!res || !res.ok) {
        throw new Error(`API returned error: ${lastError || "Could not reach Gemini API"}. Please verify your API key.`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No explanation returned from Gemini. Please try again.");
      }

      setAiCache(prev => ({ ...prev, [cacheKey]: text }));
      setAiExplanation(text);
    } catch (err: any) {
      console.error("Gemini API error:", err);
      setAiError(err.message || "Failed to generate AI explanation.");
    } finally {
      setAiLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let isBullet = false;
      let content = line;

      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        isBullet = true;
        content = trimmed.substring(2);
      } else if (trimmed.startsWith("• ")) {
        isBullet = true;
        content = trimmed.substring(2);
      } else if (/^\d+\.\s/.test(trimmed)) {
        isBullet = true;
        content = trimmed.replace(/^\d+\.\s/, "");
      }

      const parts: React.ReactNode[] = [];
      const regex = /(\*\*.*?\*\*|`.*?`)/g;
      let match;
      let lastIndex = 0;

      while ((match = regex.exec(content)) !== null) {
        const matchIndex = match.index;
        const matchText = match[0];

        if (matchIndex > lastIndex) {
          parts.push(content.substring(lastIndex, matchIndex));
        }

        if (matchText.startsWith("**") && matchText.endsWith("**")) {
          const innerText = matchText.slice(2, -2);
          const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(innerText);
          if (isJapanese) {
            parts.push(
              <strong key={matchIndex} className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30 px-1 py-0.5 rounded-md border border-blue-100/40 dark:border-blue-900/20 mx-0.5 select-all font-serif">
                {innerText}
              </strong>
            );
          } else {
            parts.push(
              <strong key={matchIndex} className="font-bold text-neutral-900 dark:text-zinc-50">
                {innerText}
              </strong>
            );
          }
        } else if (matchText.startsWith("`") && matchText.endsWith("`")) {
          parts.push(
            <code key={matchIndex} className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 text-red-500 dark:text-red-400 font-mono text-[10px]">
              {matchText.slice(1, -1)}
            </code>
          );
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc leading-relaxed text-xs text-neutral-700 dark:text-neutral-300">
            {parts}
          </li>
        );
      }

      return (
        <p key={idx} className="leading-relaxed text-xs text-neutral-700 dark:text-neutral-300 my-1 min-h-[1em]">
          {parts}
        </p>
      );
    });
  };

  // RenderSC component moved outside to optimize React rendering performance.

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
      className={`fixed z-[9999] flex flex-col max-h-[440px] rounded-2xl border border-neutral-200/60 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 no-lookup overflow-hidden select-text text-left text-neutral-800 dark:text-neutral-200 ${isDark ? "dark" : ""}`}
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-200/40 dark:border-neutral-800/40 select-none">
        <div className="flex items-center gap-0.5">
          {popupView === "dictionary" && searchHistory.length > 1 && (
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
          
          {/* Page Tab Switcher */}
          <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800/80 p-0.5 border border-neutral-200/50 dark:border-neutral-700/50">
            <button
              onClick={() => setPopupView("dictionary")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                popupView === "dictionary"
                  ? "bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              Dictionary
            </button>
            <button
              onClick={() => setPopupView("ai")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                popupView === "ai"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm shadow-blue-500/20"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-blue-500 dark:hover:text-blue-400"
              }`}
            >
              ✨ AI
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {popupView === "dictionary" && entries.length > 0 && (
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

          {popupView === "ai" && (
            <button
              onClick={() => setShowAiSettings(!showAiSettings)}
              className={`p-1 rounded-lg transition cursor-pointer ${showAiSettings ? "text-blue-500 bg-neutral-200/50 dark:bg-neutral-800/60" : "text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60 hover:text-blue-500 dark:hover:text-blue-400"}`}
              title="Gemini AI Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
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
        
        {/* ===== DICTIONARY PAGE ===== */}
        {popupView === "dictionary" && (
          <>
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
                <div className="flex gap-4 justify-between items-start">
                  <div className="flex-1 min-w-0">
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
                  </div>

                  {/* Image Preview */}
                  {index === 0 && (imageLoading || imageUrl) && (
                    <div className="shrink-0 relative select-none">
                      {imageLoading ? (
                        <div className="w-[72px] h-[72px] rounded-xl bg-neutral-100 dark:bg-neutral-900/40 animate-pulse border border-neutral-200/40 dark:border-neutral-800/40" />
                      ) : (
                        imageUrl && (
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-[72px] h-[72px] rounded-xl overflow-hidden border border-neutral-200/60 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-900 hover:scale-105 shadow-md hover:shadow-lg transition-all duration-200 cursor-zoom-in group"
                            title="Click to view full image"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl}
                              alt={entry.expression}
                              className="w-full h-full object-cover group-hover:brightness-95 transition-all"
                              onError={() => setImageUrl(null)}
                            />
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Definitions (RenderStructuredContent) */}
                <div className="mt-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-sans leading-relaxed">
                  <RenderSC content={entry.definition} onSearchQuery={handleSearchQuery} />
                </div>
              </div>
            ))}
          </>
        )}

        {/* ===== AI EXPLANATION PAGE ===== */}
        {popupView === "ai" && (
          <div className="space-y-3">
            {/* Word context header */}
            {entries.length > 0 && (
              <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100 dark:border-neutral-800/50">
                <span className="text-lg font-bold font-serif text-neutral-950 dark:text-zinc-50 leading-none">
                  {entries[0].expression}
                </span>
                {entries[0].reading && entries[0].reading !== entries[0].expression && (
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 font-sans leading-none">
                    【{entries[0].reading}】
                  </span>
                )}
              </div>
            )}

            {/* Gemini AI Settings Form (Inline) */}
            {showAiSettings && (
              <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    API Settings
                  </span>
                  <button
                    onClick={() => setShowAiSettings(false)}
                    className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 leading-normal">
                  Your API key is saved locally in LocalStorage and is sent directly to Google.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Paste Gemini API Key..."
                    defaultValue={geminiApiKey}
                    id="gemini-api-key-popup-input"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const val = (document.getElementById("gemini-api-key-popup-input") as HTMLInputElement)?.value || "";
                      handleSaveApiKey(val);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* AI Content Area */}
            {!showAiSettings && (
              <div className="space-y-3">


                {/* No API key state */}
                {!geminiApiKey ? (
                  <div className="text-center py-6 space-y-3 select-none">
                    <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                      <span className="text-lg">✨</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-normal max-w-[280px] mx-auto">
                      Enter your Gemini API Key to enable context-aware grammar and sentence analysis.
                    </p>
                    <button
                      onClick={() => setShowAiSettings(true)}
                      className="px-4 py-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-full transition cursor-pointer"
                    >
                      Configure API Key
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Context Controls */}
                    <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/50 dark:border-neutral-800/60 rounded-xl p-2.5 space-y-2.5 text-[11px] font-sans">
                      <div className="flex justify-between items-center select-none text-[10px] text-neutral-500 font-mono">
                        <div className="flex items-center gap-1">
                          <span>Context Before:</span>
                          <button
                            onClick={() => setContextCountBefore(prev => Math.max(0, prev - 1))}
                            className="w-4 h-4 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-neutral-700 dark:text-neutral-300">{contextCountBefore}</span>
                          <button
                            onClick={() => setContextCountBefore(prev => Math.min(prevSentences.length, prev + 1))}
                            className="w-4 h-4 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <span>Context After:</span>
                          <button
                            onClick={() => setContextCountAfter(prev => Math.max(0, prev - 1))}
                            className="w-4 h-4 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-neutral-700 dark:text-neutral-300">{contextCountAfter}</span>
                          <button
                            onClick={() => setContextCountAfter(prev => Math.min(nextSentences.length, prev + 1))}
                            className="w-4 h-4 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Displaying context text */}
                      <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 scrollbar-thin select-text font-serif leading-relaxed text-xs">
                        {contextCountBefore > 0 && prevSentences.slice(0, contextCountBefore).reverse().map((s, idx) => (
                          <div key={`prev-${idx}`} className="text-neutral-400 dark:text-neutral-500 italic opacity-70">
                            {s}
                          </div>
                        ))}
                        {contextSentence && (
                          <div className="text-neutral-900 dark:text-zinc-50 font-bold border-l-2 border-indigo-400 pl-2 bg-indigo-50/20 dark:bg-indigo-950/10 py-0.5 my-1">
                            {contextSentence}
                          </div>
                        )}
                        {contextCountAfter > 0 && nextSentences.slice(0, contextCountAfter).map((s, idx) => (
                          <div key={`next-${idx}`} className="text-neutral-400 dark:text-neutral-500 italic opacity-70">
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Main output text / loading / error / action */}
                    {aiLoading ? (
                      <div className="space-y-2.5 py-4 select-none animate-pulse">
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full w-11/12" />
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full w-4/5" />
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full w-9/12" />
                        <div className="flex items-center justify-center pt-3 gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-blue-500 animate-spin" />
                          <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Gemini is analyzing...</span>
                        </div>
                      </div>
                    ) : aiError ? (
                      <div className="space-y-2 text-center py-4">
                        <div className="w-8 h-8 mx-auto rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                        </div>
                        <p className="text-[10px] text-red-500 dark:text-red-400 leading-normal">{aiError}</p>
                        <div className="flex justify-center gap-3 select-none">
                          <button
                            onClick={handleExplainWithAi}
                            className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                          >
                            Retry
                          </button>
                          <button
                            onClick={() => setShowAiSettings(true)}
                            className="text-[10px] font-bold text-neutral-400 hover:underline cursor-pointer"
                          >
                            Update Key
                          </button>
                        </div>
                      </div>
                    ) : aiExplanation ? (
                      <div className="space-y-1 font-sans select-text max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                        {parseMarkdown(aiExplanation)}
                        
                        {/* Explanations action footer */}
                        <div className="flex justify-end gap-3 pt-2.5 text-[9px] font-bold text-neutral-400 select-none border-t border-neutral-100 dark:border-neutral-900/30 mt-3">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(aiExplanation);
                            }}
                            className="hover:text-blue-500 cursor-pointer flex items-center gap-0.5"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => {
                              const activePrev = prevSentences.slice(0, contextCountBefore).reverse().join("\n");
                              const activeNext = nextSentences.slice(0, contextCountAfter).join("\n");
                              const cacheKey = `sentence:${contextSentence}:${activePrev}:${activeNext}:${contextCountBefore}:${contextCountAfter}`;
                              const newCache = { ...aiCache };
                              delete newCache[cacheKey];
                              setAiCache(newCache);
                              setAiExplanation(null);
                              setTimeout(() => {
                                handleExplainWithAi();
                              }, 55);
                            }}
                            className="hover:text-blue-500 cursor-pointer flex items-center gap-0.5"
                          >
                            Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center py-1 select-none">
                        <button
                          onClick={handleExplainWithAi}
                          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/15 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          ✨ Explain Sentence
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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

interface RenderSCProps {
  content: any;
  onSearchQuery: (query: string) => void;
}

const RenderSC: React.FC<RenderSCProps> = ({ content, onSearchQuery }) => {
  if (content === null || content === undefined) return null;
  if (typeof content === "string") return <>{content}</>;
  if (Array.isArray(content)) {
    return (
      <>
        {content.map((item, index) => (
          <RenderSC key={index} content={item} onSearchQuery={onSearchQuery} />
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
        return <ruby className="ruby-text"><RenderSC content={children} onSearchQuery={onSearchQuery} /></ruby>;
      case "rt":
        return <rt className="text-[10px] text-neutral-400 dark:text-neutral-500 select-none font-sans font-normal leading-none"><RenderSC content={children} onSearchQuery={onSearchQuery} /></rt>;
      case "a":
        if (href && href.startsWith("?query=")) {
          const queryVal = decodeURIComponent(href.split("query=")[1].split("&")[0]);
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchQuery(queryVal);
              }}
              className="text-blue-500 dark:text-blue-400 hover:underline inline font-medium cursor-pointer"
            >
              <RenderSC content={children} onSearchQuery={onSearchQuery} />
            </button>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">
            <RenderSC content={children} onSearchQuery={onSearchQuery} />
          </a>
        );
      case "ul":
        return <ul className="list-disc pl-4 space-y-1.5 my-1.5 text-neutral-600 dark:text-neutral-300"><RenderSC content={children} onSearchQuery={onSearchQuery} /></ul>;
      case "ol":
        return <ol className="list-decimal pl-4 space-y-1.5 my-1.5 text-neutral-600 dark:text-neutral-300"><RenderSC content={children} onSearchQuery={onSearchQuery} /></ol>;
      case "li":
        return <li className="leading-relaxed"><RenderSC content={children} onSearchQuery={onSearchQuery} /></li>;
      case "table": {
        const hasTableSections = Array.isArray(children)
          ? children.some(c => c && typeof c === "object" && (c.tag === "thead" || c.tag === "tbody" || c.tag === "tfoot"))
          : (children && typeof children === "object" && (children.tag === "thead" || children.tag === "tbody" || children.tag === "tfoot"));
        return (
          <table className="w-full text-xs border-collapse border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden my-2">
            {hasTableSections ? (
              <RenderSC content={children} onSearchQuery={onSearchQuery} />
            ) : (
              <tbody>
                <RenderSC content={children} onSearchQuery={onSearchQuery} />
              </tbody>
            )}
          </table>
        );
      }
      case "thead":
        return <thead className="bg-neutral-50 dark:bg-neutral-900"><RenderSC content={children} onSearchQuery={onSearchQuery} /></thead>;
      case "tbody":
        return <tbody><RenderSC content={children} onSearchQuery={onSearchQuery} /></tbody>;
      case "tr":
        return <tr className="border-b border-neutral-100 dark:border-neutral-900/60"><RenderSC content={children} onSearchQuery={onSearchQuery} /></tr>;
      case "th":
        return <th className="px-2 py-1 text-left font-semibold text-neutral-500 dark:text-neutral-400"><RenderSC content={children} onSearchQuery={onSearchQuery} /></th>;
      case "td":
        return <td className="px-2 py-1 text-neutral-600 dark:text-neutral-300"><RenderSC content={children} onSearchQuery={onSearchQuery} /></td>;
      case "div":
        return <div {...props}><RenderSC content={children} onSearchQuery={onSearchQuery} /></div>;
      case "span":
      default:
        return <span {...props}><RenderSC content={children} onSearchQuery={onSearchQuery} /></span>;
    }
  }
  return null;
};
