"use client";

import React from "react";
import { 
  GearIcon, ClockIcon, TrashIcon, BookOpenIcon, 
  VolumeIcon, VolumeMuteIcon, TextIcon 
} from "./Icons";
import { ReaderSettings, ReaderTheme } from "../types";
import { ConnectionStatus as WSStatus } from "../hooks/useWebSocket";

interface ControlBarProps {
  settings: ReaderSettings;
  onUpdateSettings: (settings: Partial<ReaderSettings>) => void;
  status: WSStatus;
  onToggleConnection: () => void;
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  onClearHistory: () => void;
  historyCount: number;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  settings,
  onUpdateSettings,
  status,
  onToggleConnection,
  onToggleHistory,
  onOpenSettings,
  onClearHistory,
  historyCount,
}) => {

  // Toggle layout
  const handleToggleLayout = () => {
    const nextLayout = settings.layout === "horizontal" ? "vertical" : "horizontal";
    onUpdateSettings({ layout: nextLayout });
  };

  // Toggle AutoTTS
  const handleToggleTTS = () => {
    onUpdateSettings({ autoTTS: !settings.autoTTS });
  };


  const getConnectionColor = () => {
    switch (status) {
      case "connected":
        return "bg-emerald-500 shadow-emerald-500/50";
      case "connecting":
        return "bg-amber-500 shadow-amber-500/50 animate-pulse";
      case "disconnected":
      default:
        return "bg-rose-500 shadow-rose-500/50";
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 select-none no-lookup">
      <div className="flex items-center gap-4 md:gap-5 px-6 py-3 rounded-full bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/40 backdrop-blur-xl shadow-2xl transition-all duration-300">
        
        {/* Connection Toggle */}
        <button
          onClick={onToggleConnection}
          className="relative group p-2 rounded-full hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 transition-all duration-200 active:scale-90 cursor-pointer flex items-center justify-center"
          title={status === "connected" ? "Disconnect from Textractor" : "Connect to Textractor"}
        >
          <div className={`w-3 h-3 rounded-full border border-white dark:border-neutral-950 shadow-sm ${getConnectionColor()}`} />
          <span className="absolute -top-10 scale-0 transition-all rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:scale-100 whitespace-nowrap z-50">
            WS: {status.toUpperCase()}
          </span>
        </button>

        <div className="w-px h-5 bg-neutral-300/60 dark:bg-neutral-800" />

        {/* History Sidebar Toggle */}
        <button
          onClick={onToggleHistory}
          className="relative group p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200 active:scale-90 cursor-pointer flex items-center justify-center"
          title="Toggle history panel"
        >
          <ClockIcon size={20} />
          {historyCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-neutral-900 shadow-sm animate-in fade-in duration-300">
              {historyCount}
            </span>
          )}
          <span className="absolute -top-10 scale-0 transition-all rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:scale-100 whitespace-nowrap z-50">
            History
          </span>
        </button>

        {/* Horizontal/Vertical Layout Switch */}
        <button
          onClick={handleToggleLayout}
          className="relative group p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200 active:scale-90 cursor-pointer flex items-center justify-center"
          title={settings.layout === "horizontal" ? "Switch to Vertical Reading" : "Switch to Horizontal Reading"}
        >
          {settings.layout === "horizontal" ? <BookOpenIcon size={20} /> : <TextIcon size={20} />}
          <span className="absolute -top-10 scale-0 transition-all rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:scale-100 whitespace-nowrap z-50">
            {settings.layout === "horizontal" ? "Vertical Mode" : "Horizontal Mode"}
          </span>
        </button>



        {/* TTS Quick Mute / Unmute */}
        <button
          onClick={handleToggleTTS}
          className="relative group p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200 active:scale-90 cursor-pointer flex items-center justify-center"
          title={settings.autoTTS ? "Turn off auto TTS" : "Turn on auto TTS"}
        >
          {settings.autoTTS ? <VolumeIcon size={20} /> : <VolumeMuteIcon size={20} className="text-neutral-400 dark:text-neutral-600" />}
          <span className="absolute -top-10 scale-0 transition-all rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:scale-100 whitespace-nowrap z-50">
            Auto Read Aloud
          </span>
        </button>

        <div className="w-px h-5 bg-neutral-300/60 dark:bg-neutral-800" />

        {/* Settings modal gear */}
        <button
          onClick={onOpenSettings}
          className="relative group p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200 active:scale-90 cursor-pointer flex items-center justify-center"
          title="Open settings"
        >
          <GearIcon size={20} />
          <span className="absolute -top-10 scale-0 transition-all rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:scale-100 whitespace-nowrap z-50">
            Settings
          </span>
        </button>

        {/* Clear history button */}
        {historyCount > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Clear all text from reader window?")) {
                onClearHistory();
              }
            }}
            className="relative group p-2 rounded-full text-rose-500/80 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 active:scale-90 cursor-pointer flex items-center justify-center"
            title="Clear active display"
          >
            <TrashIcon size={20} />
            <span className="absolute -top-10 scale-0 transition-all rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:scale-100 whitespace-nowrap z-50">
              Clear Reader
            </span>
          </button>
        )}

      </div>
    </div>
  );
};
