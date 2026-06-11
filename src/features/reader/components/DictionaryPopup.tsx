import React, { useEffect, useState } from "react";

export interface DictionaryResult {
  expression: string;
  reading: string;
  definitionTags: string[];
  rules: string[];
  popularity: number | null;
  definition: string | string[] | any; // Handle various definitions structures safely
  sequence: number | null;
  matchedText: string;
  matchedLength: number;
}

interface DictionaryPopupProps {
  word: string;
  results: DictionaryResult[];
  position: { x: number; y: number };
  onClose: () => void;
  theme: "light" | "sepia" | "dark" | "midnight" | "forest";
}

export const DictionaryPopup: React.FC<DictionaryPopupProps> = ({
  word,
  results,
  position,
  onClose,
  theme,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Position adjustments to prevent screen overflow
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const popupWidth = 360;
    const popupHeight = 280;
    const padding = 16;
    
    let left = position.x + 10;
    let top = position.y + 15;

    // Boundary check right
    if (left + popupWidth > window.innerWidth - padding) {
      left = position.x - popupWidth - 10;
    }
    // Boundary check bottom
    if (top + popupHeight > window.innerHeight - padding) {
      top = position.y - popupHeight - 15;
    }
    
    // Boundary check left/top minimums
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    setCoords({ top, left });
  }, [position]);

  if (results.length === 0) return null;

  const activeResult = results[activeIndex];

  // Voice Speech Synthesis TTS helper
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop previous speaking
    const utterance = new SpeechSynthesisUtterance(activeResult.expression);
    utterance.lang = "ja-JP";
    
    // Search for a ja-JP voice if available
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang.startsWith("ja"));
    if (jaVoice) {
      utterance.voice = jaVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  // Extract clean definitions as strings
  const getDefinitionsArray = (def: any): string[] => {
    if (!def) return [];
    if (Array.isArray(def)) {
      return def.flatMap(d => {
        if (typeof d === "string") return [d];
        if (d.text) return [d.text];
        if (typeof d === "object" && d.type === "text") return [d.text];
        return [];
      });
    }
    if (typeof def === "string") return [def];
    return [];
  };

  const definitions = getDefinitionsArray(activeResult.definition);


  // Theme-specific CSS classes
  const getThemeClasses = () => {
    switch (theme) {
      case "light":
        return "bg-white border-neutral-205 text-neutral-800 shadow-xl";
      case "sepia":
        return "bg-[#f5ebd6] border-[#e4d6b5] text-[#4a3621] shadow-xl";
      case "dark":
        return "bg-[#121212] border-neutral-800 text-neutral-200 shadow-2xl";
      case "midnight":
        return "bg-[#0b0f19]/90 border-blue-900/30 text-slate-200 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.7)]";
      case "forest":
        return "bg-[#16211d] border-[#253830] text-[#cfdfd5] shadow-xl";
      default:
        return "bg-neutral-900 border-neutral-800 text-neutral-100 shadow-2xl";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: "360px",
        zIndex: 5000,
      }}
      className={`rounded-2xl border p-4 font-sans text-xs transition-all duration-150 animate-in fade-in zoom-in-95 duration-100 select-none ${getThemeClasses()}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header: Term, Reading, TTS and Save */}
      <div className="flex items-start justify-between border-b pb-2 border-current/10 gap-4">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-xl font-bold font-serif leading-none tracking-tight">
              {activeResult.expression}
            </h3>
            {activeResult.reading && (
              <span className="text-xs font-mono opacity-80">
                【{activeResult.reading}】
              </span>
            )}
          </div>
          
          {/* Deconjugation details */}
          {activeResult.rules && activeResult.rules.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {activeResult.rules.map((rule, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20"
                >
                  {rule}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* TTS Button */}
          <button
            onClick={handleSpeak}
            className="p-1.5 rounded-lg hover:bg-current/10 border border-current/10 transition cursor-pointer"
            title="Pronounce Word"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>


        </div>
      </div>

      {/* Multiple Results Tabs */}
      {results.length > 1 && (
        <div className="flex items-center gap-1 mt-2 overflow-x-auto py-1 border-b border-current/5 scrollbar-none">
          <span className="text-[10px] opacity-50 shrink-0 mr-1 font-mono">Matches ({results.length}):</span>
          {results.map((r, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium font-mono shrink-0 cursor-pointer ${
                activeIndex === idx
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-current/5 hover:bg-current/10 opacity-70"
              }`}
            >
              {r.expression}
            </button>
          ))}
        </div>
      )}

      {/* Popularity and Sequence Indicators */}
      <div className="mt-2 flex items-center gap-3 text-[9px] font-mono opacity-60">
        {activeResult.popularity !== null && activeResult.popularity !== undefined && (
          <span>⭐ Rank: #{activeResult.popularity}</span>
        )}
        {activeResult.definitionTags && activeResult.definitionTags.length > 0 && (
          <span>📋 {activeResult.definitionTags.join(", ")}</span>
        )}
      </div>

      {/* Definitions Content */}
      <div className="mt-3 overflow-y-auto max-h-[140px] pr-1 leading-relaxed font-sans scrollbar-thin">
        {definitions.length > 0 ? (
          <ol className="list-decimal pl-4 flex flex-col gap-1.5">
            {definitions.map((defText, idx) => (
              <li key={idx} className="pl-1">
                {defText}
              </li>
            ))}
          </ol>
        ) : (
          <p className="italic opacity-60">No translation details found.</p>
        )}
      </div>

      {/* Footer helper */}
      <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-[9px] font-mono opacity-50 select-none">
        <span>Matched: &ldquo;{activeResult.matchedText}&rdquo;</span>
        <button
          onClick={onClose}
          className="hover:underline hover:opacity-100 font-bold uppercase tracking-wider cursor-pointer"
        >
          Close [Esc]
        </button>
      </div>
    </div>
  );
};
