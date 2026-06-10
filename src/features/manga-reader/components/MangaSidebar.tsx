"use client";

import React from "react";
import { OCRTextBlock } from "../types";

interface MangaSidebarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ocrActive: boolean;
  setOcrActive: (val: boolean) => void;
  showBBoxes: boolean;
  setShowBBoxes: (val: boolean) => void;
  overlayOpacity: number;
  setOverlayOpacity: (val: number) => void;
  fontScale: number;
  setFontScale: (val: number) => void;
  readingDirection: "rtl" | "ltr";
  setReadingDirection: (val: "rtl" | "ltr") => void;
  ocrLanguage: "jpn_vert" | "jpn" | "eng";
  setOcrLanguage: (val: "jpn_vert" | "jpn" | "eng") => void;
  isDrawMode: boolean;
  setIsDrawMode: (val: boolean) => void;
  onForceOcr: () => void;
  ocrLoading: boolean;
  ocrProgress: number;
  textBlocks: OCRTextBlock[];
  hoveredBlockId: string | null;
  setHoveredBlockId: (id: string | null) => void;
  onSelectMangaMenu: () => void;
  mangaName: string;
  zoomMode: "fit-height" | "fit-width" | "original";
  setZoomMode: (val: "fit-height" | "fit-width" | "original") => void;
}

export const MangaSidebar: React.FC<MangaSidebarProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  ocrActive,
  setOcrActive,
  showBBoxes,
  setShowBBoxes,
  overlayOpacity,
  setOverlayOpacity,
  fontScale,
  setFontScale,
  readingDirection,
  setReadingDirection,
  ocrLanguage,
  setOcrLanguage,
  isDrawMode,
  setIsDrawMode,
  onForceOcr,
  ocrLoading,
  ocrProgress,
  textBlocks,
  hoveredBlockId,
  setHoveredBlockId,
  onSelectMangaMenu,
  mangaName,
  zoomMode,
  setZoomMode,
}) => {

  const handleSpeak = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = ocrLanguage.startsWith("jpn") ? "ja-JP" : "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="w-80 border-l border-zinc-900 bg-[#09090b]/80 backdrop-blur-md flex flex-col h-[82vh] overflow-y-auto shrink-0 select-none p-5 gap-6 text-zinc-300 font-sans">
      
      {/* Manga Info & Library Back */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onSelectMangaMenu}
          className="text-[10px] font-bold text-zinc-500 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-wider cursor-pointer font-mono"
        >
          ← Back to Library
        </button>
        <h3 className="text-sm font-black text-white truncate max-w-xs" title={mangaName}>
          {mangaName}
        </h3>
      </div>

      <hr className="border-zinc-900" />

      {/* Navigation slider */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-400">Navigation</span>
          <span className="font-mono text-zinc-200 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">
            {currentPage + 1} / {totalPages}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={Math.max(0, totalPages - 1)}
          value={currentPage}
          onChange={(e) => onPageChange(parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex-1 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
          >
            {readingDirection === "rtl" ? "Next →" : "← Prev"}
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="flex-1 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
          >
            {readingDirection === "rtl" ? "← Prev" : "Next →"}
          </button>
        </div>
      </div>

      <hr className="border-zinc-900" />

      {/* Settings section */}
      <div className="flex flex-col gap-4">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Reader Settings</h4>
        
        {/* Zoom Mode */}
        <div className="flex flex-col gap-1.5 text-xs">
          <span className="text-zinc-400">Page Fitting Mode</span>
          <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-900">
            {(["fit-height", "fit-width", "original"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setZoomMode(mode)}
                className={`flex-1 py-1 rounded text-[10px] font-bold capitalize transition cursor-pointer ${
                  zoomMode === mode ? "bg-zinc-900 text-white shadow" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {mode.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Reading direction */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Reading Direction</span>
          <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-900 w-28">
            {(["rtl", "ltr"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setReadingDirection(dir)}
                className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                  readingDirection === dir ? "bg-zinc-900 text-white shadow" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-zinc-900" />

      {/* OCR Control Panel */}
      <div className="flex flex-col gap-4">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">OCR Engine</h4>

        {/* OCR Language */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Language Mode</span>
          <select
            value={ocrLanguage}
            onChange={(e) => setOcrLanguage(e.target.value as any)}
            className="bg-zinc-950 text-zinc-200 border border-zinc-900 rounded p-1 text-[11px] font-semibold focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="jpn_vert">Japanese (Vertical)</option>
            <option value="jpn">Japanese (Horizontal)</option>
            <option value="eng">English</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-3 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-zinc-400">Enable Selection Layer</span>
            <input
              type="checkbox"
              checked={ocrActive}
              onChange={(e) => setOcrActive(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-800 text-violet-500 focus:ring-0 cursor-pointer accent-violet-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-zinc-400">Draw Bounding Boxes</span>
            <input
              type="checkbox"
              checked={showBBoxes}
              onChange={(e) => setShowBBoxes(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-800 text-violet-500 focus:ring-0 cursor-pointer accent-violet-600"
            />
          </label>
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-3 text-xs">
          {/* Opacity */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>Text Overlay Opacity</span>
              <span>{Math.round(overlayOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-full h-0.5 bg-zinc-850 appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Font scale */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>Overlay Font Size Scale</span>
              <span>{fontScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              className="w-full h-0.5 bg-zinc-850 appearance-none cursor-pointer accent-violet-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsDrawMode(!isDrawMode)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition duration-300 cursor-pointer ${
              isDrawMode
                ? "bg-red-950/20 border-red-500/50 text-red-400"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-850 text-zinc-200"
            }`}
          >
            ✏️ {isDrawMode ? "Cancel Draw" : "Draw bubble"}
          </button>
          
          <button
            onClick={onForceOcr}
            disabled={ocrLoading}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-violet-650 hover:bg-violet-750 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition duration-300 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {ocrLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>🔍 Scan Page</>
            )}
          </button>
        </div>

        {ocrLoading && (
          <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-900 overflow-hidden">
            <div 
              className="bg-violet-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${ocrProgress * 100}%` }}
            />
          </div>
        )}
      </div>

      <hr className="border-zinc-900" />

      {/* Scanned Text List */}
      <div className="flex-1 flex flex-col min-h-[160px] gap-2 overflow-hidden">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center justify-between">
          <span>Scanned Text ({textBlocks.length})</span>
          <span className="text-[9px] lowercase italic font-normal text-zinc-555">Shift + hover to lookup</span>
        </h4>

        {textBlocks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20 text-center p-4">
            <p className="text-[11px] text-zinc-550 italic leading-relaxed">
              No text blocks scanned on this page. Click Scan Page or Draw bubble above to begin.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
            {textBlocks.map((block) => (
              <div
                key={block.id}
                onMouseEnter={() => setHoveredBlockId(block.id)}
                onMouseLeave={() => setHoveredBlockId(null)}
                className={`p-2.5 rounded-xl border transition duration-200 select-text text-left relative group/item ${
                  hoveredBlockId === block.id
                    ? "bg-zinc-900/60 border-violet-500/50 shadow-md shadow-violet-950/20"
                    : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800"
                }`}
              >
                {/* Overlay highlight block indicator on hover */}
                <p className="text-xs font-serif leading-relaxed text-zinc-200 select-all pr-12 break-all">
                  {block.text}
                </p>
                
                {/* Actions overlay panel */}
                <div className="absolute right-2 top-2.5 flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition duration-150 select-none">
                  <button
                    onClick={() => handleSpeak(block.text)}
                    className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                    title="Speak text aloud"
                  >
                    🔊
                  </button>
                  <button
                    onClick={() => handleCopy(block.text)}
                    className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                    title="Copy text"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

MangaSidebar.displayName = "MangaSidebar";
