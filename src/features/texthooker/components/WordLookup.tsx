"use client";

import React, { useEffect, useState, useRef } from "react";
import { VolumeIcon, CopyIcon, ExternalLinkIcon, CheckIcon } from "./Icons";

interface WordLookupProps {
  onSpeak: (text: string) => void;
}

interface SelectionCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const WordLookup: React.FC<WordLookupProps> = ({ onSpeak }) => {
  const [selectedText, setSelectedText] = useState("");
  const [coords, setCoords] = useState<SelectionCoords | null>(null);
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection) return;

      const text = selection.toString().trim();
      if (!text) {
        // Only clear if the click wasn't inside our popup to prevent immediate dismissal when clicking buttons
        return;
      }

      // Check if we are selecting something inside a reader or history panel
      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;

      // Ensure we selected Japanese/general text, and not inputs or controls
      const parentElement = anchorNode.parentElement;
      if (parentElement && (
        parentElement.closest("input") || 
        parentElement.closest("textarea") || 
        parentElement.closest("button") ||
        parentElement.closest(".no-lookup")
      )) {
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Set coordinates relative to window
      setSelectedText(text);
      setCoords({
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      // If clicking outside popup, clear selection
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setSelectedText("");
        setCoords(null);
        // Clear window selection
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getJishoUrl = () => {
    return `https://jisho.org/search/${encodeURIComponent(selectedText)}`;
  };

  const getDeepLUrl = () => {
    return `https://www.deepl.com/translator#ja/en/${encodeURIComponent(selectedText)}`;
  };

  const getGoogleTranslateUrl = () => {
    return `https://translate.google.com/?sl=ja&tl=en&text=${encodeURIComponent(selectedText)}&op=translate`;
  };

  if (!selectedText || !coords) return null;

  // Calculate position: absolute positioning relative to document body.
  // Center above selection box.
  const popupWidth = 240;
  const left = coords.x + coords.width / 2 - popupWidth / 2;
  const top = coords.y - 54; // 50px above selection

  return (
    <div
      ref={popupRef}
      style={{
        left: `${Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10))}px`,
        top: `${Math.max(10, top)}px`,
      }}
      className="absolute z-50 flex items-center gap-1.5 p-1.5 rounded-full bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200/60 dark:border-neutral-800/80 animate-in fade-in zoom-in-95 duration-100 no-lookup select-none"
    >
      {/* Selected text preview */}
      <span className="text-[11px] font-semibold font-serif px-2.5 max-w-[80px] truncate text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
        {selectedText}
      </span>

      {/* Jisho Search */}
      <a
        href={getJishoUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
        title="Jisho Dictionary Lookup"
      >
        <span className="text-[10px] font-bold px-0.5">辞</span>
      </a>

      {/* DeepL */}
      <a
        href={getDeepLUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
        title="DeepL Translate"
      >
        <span className="text-[10px] font-bold px-0.5">D</span>
      </a>

      {/* Google Translate */}
      <a
        href={getGoogleTranslateUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
        title="Google Translate"
      >
        <span className="text-[10px] font-bold px-0.5">G</span>
      </a>

      {/* Speak */}
      <button
        onClick={() => onSpeak(selectedText)}
        className="flex items-center justify-center p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
        title="Speak selection"
      >
        <VolumeIcon size={12} />
      </button>

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="flex items-center justify-center p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
        title="Copy selection"
      >
        {copied ? <CheckIcon size={12} className="text-emerald-500" /> : <CopyIcon size={12} />}
      </button>
    </div>
  );
};
