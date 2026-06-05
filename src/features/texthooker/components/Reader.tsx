"use client";

import React, { useEffect, useRef, useState } from "react";
import { HookedSentence, ReaderSettings } from "../types";
import { CopyIcon, CheckIcon, VolumeIcon } from "./Icons";

interface ReaderProps {
  history: HookedSentence[];
  settings: ReaderSettings;
  onSpeak: (text: string) => void;
}

export const Reader: React.FC<ReaderProps> = ({ history, settings, onSpeak }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to the latest sentence when it arrives
  useEffect(() => {
    if (latestRef.current) {
      latestRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [history.length]);

  const handleCopy = (e: React.MouseEvent, item: HookedSentence) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getFontFamilyClass = () => {
    switch (settings.fontFamily) {
      case "serif":
        return 'font-serif font-["Hiragino Mincho ProN","Yu_Mincho",YuMincho,"Hiragino_Mincho_ProN","MS_Mincho","Noto_Serif_JP",serif]';
      case "rounded":
        return 'font-mono font-["Hiragino_Maru_Gothic_ProN",Meiryo,"Kosugi_Maru",monospace]';
      case "sans":
      default:
        return 'font-sans font-[system-ui,-apple-system,Meiryo,"Hiragino_Kaku_Gothic_ProN","Noto_Sans_JP",sans-serif]';
    }
  };

  const getAlignmentClass = () => {
    if (settings.layout === "vertical") return "";
    switch (settings.alignment) {
      case "center":
        return "text-center justify-center";
      case "right":
        return "text-right justify-end";
      case "left":
      default:
        return "text-left justify-start";
    }
  };

  const getThemeTextClass = (isFocused: boolean) => {
    if (isFocused) {
      switch (settings.theme) {
        case "light":
          return "text-zinc-900 opacity-100 font-medium";
        case "sepia":
          return "text-[#433422] opacity-100 font-medium";
        case "dark":
          return "text-zinc-100 opacity-100 font-medium";
        case "midnight":
        default:
          return "text-neutral-100 opacity-100 font-medium";
      }
    } else {
      switch (settings.theme) {
        case "light":
          return "text-zinc-400 opacity-30 hover:opacity-85 hover:text-zinc-700 transition-all duration-200";
        case "sepia":
          return "text-[#433422] opacity-30 hover:opacity-85 transition-all duration-200";
        case "dark":
          return "text-zinc-500 opacity-45 hover:opacity-90 hover:text-zinc-300 transition-all duration-200";
        case "midnight":
        default:
          return "text-neutral-500 opacity-45 hover:opacity-90 hover:text-neutral-300 transition-all duration-200";
      }
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="max-w-md flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/60 flex items-center justify-center text-neutral-400 dark:text-neutral-500 shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
              Waiting for Textractor
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed px-4">
              Start your game and select a text thread inside Textractor. The hook server will stream dialogue here automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Generate styled object dynamically for typographic properties
  const sentenceStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineSpacing,
    letterSpacing: `${settings.letterSpacing}em`,
  };

  const isVertical = settings.layout === "vertical";

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-auto p-8 md:p-12 scrollbar-thin select-text ${
        isVertical ? "flex justify-end overflow-y-hidden overflow-x-auto" : "flex flex-col"
      }`}
    >
      <div
        className={`flex ${
          isVertical 
            ? "flex-row-reverse h-full" 
            : "flex-col w-full px-4 md:px-12"
        } gap-8 ${getAlignmentClass()}`}
        style={
          isVertical
            ? {
                writingMode: "vertical-rl",
                WebkitWritingMode: "vertical-rl",
              }
            : undefined
        }
      >
        {history.map((item, index) => {
          const isLatest = index === history.length - 1;
          const isFocused = !settings.focusMode || isLatest;
          const ref = isLatest ? latestRef : null;

          return (
            <div
              key={item.id}
              ref={ref}
              style={sentenceStyle}
              className={`relative group flex ${
                isVertical ? "flex-col" : "flex-row"
              } gap-3 rounded-2xl p-4 transition-all duration-300 hover:bg-neutral-100/40 dark:hover:bg-neutral-800/10 cursor-pointer ${
                getFontFamilyClass()
              } ${getThemeTextClass(isFocused)}`}
            >
              {/* Optional Index/Timestamp marker */}
              {settings.showTimestamp && (
                <div
                  className={`text-[10px] text-neutral-400 dark:text-neutral-500 font-mono self-start opacity-70 group-hover:opacity-100 transition-opacity select-none ${
                    isVertical ? "mb-2 border-b pb-1" : "mr-2 pt-1 border-r pr-2"
                  } border-neutral-200 dark:border-neutral-800`}
                >
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              )}

              {/* Hooked sentence content */}
              <div className="flex-1 whitespace-pre-wrap break-all select-all">
                {item.text}
              </div>

              {/* Hover action shortcuts (inline) */}
              <div
                className={`flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 no-lookup select-none ${
                  isVertical
                    ? "mt-2 pt-2 border-t border-neutral-200/30 dark:border-neutral-800/30 flex-col items-center self-end"
                    : "ml-2 pl-2 border-l border-neutral-200/30 dark:border-neutral-800/30 items-start self-center"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* TTS Play Button */}
                <button
                  onClick={() => onSpeak(item.text)}
                  className="p-1.5 rounded-full bg-white dark:bg-neutral-950 text-neutral-500 hover:text-blue-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-sm border border-neutral-200/40 dark:border-neutral-800/40 transition cursor-pointer"
                  title="Read aloud"
                >
                  <VolumeIcon size={12} />
                </button>

                {/* Copy Button */}
                <button
                  onClick={(e) => handleCopy(e, item)}
                  className="p-1.5 rounded-full bg-white dark:bg-neutral-950 text-neutral-500 hover:text-blue-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-sm border border-neutral-200/40 dark:border-neutral-800/40 transition cursor-pointer"
                  title="Copy to clipboard"
                >
                  {copiedId === item.id ? (
                    <CheckIcon size={12} className="text-emerald-500" />
                  ) : (
                    <CopyIcon size={12} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
