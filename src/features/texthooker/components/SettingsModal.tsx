import React from "react";
import { ReaderSettings, ReaderTheme, FontFamily, TextAlignment } from "../types";
import { XIcon } from "./Icons";
import { ConnectionStatus } from "./ConnectionStatus";
import { ConnectionStatus as WSStatus } from "../hooks/useWebSocket";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdate: (settings: Partial<ReaderSettings>) => void;
  onReset: () => void;
  voices: SpeechSynthesisVoice[];
  status: WSStatus;
  url: string;
  error: string | null;
  onUrlChange: (url: string) => void;
  onReconnect: () => void;
  onMockTrigger: (text: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onReset,
  voices,
  status,
  url,
  error,
  onUrlChange,
  onReconnect,
  onMockTrigger,
}) => {
  if (!isOpen) return null;


  const fonts: { id: FontFamily; label: string; style: string }[] = [
    { id: "serif", label: "Hiragino Mincho", style: "font-serif" },
    { id: "sans", label: "Gothic (Sans)", style: "font-sans" },
    { id: "rounded", label: "Rounded (Casual)", style: "font-mono" }, // Fallback to mono style, but styled separately in css
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 shadow-2xl transition-all flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800/80">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            Control & Settings
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 flex flex-col gap-6 text-sm">
          
          {/* Section: Server connection settings inside SettingsModal */}
          <ConnectionStatus
            status={status}
            url={url}
            error={error}
            onUrlChange={onUrlChange}
            onReconnect={onReconnect}
            onMockTrigger={onMockTrigger}
          />


          

          {/* Section: Typography */}
          <div className="flex flex-col gap-4">
            <span className="font-semibold text-neutral-500 dark:text-neutral-400 text-xs tracking-wider uppercase">
              Typography
            </span>

            {/* Font Family */}
            <div className="flex flex-col gap-1.5">
              <label className="text-neutral-700 dark:text-neutral-300 font-medium">Font Family</label>
              <div className="grid grid-cols-3 gap-2">
                {fonts.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onUpdate({ fontFamily: f.id })}
                    className={`py-2 px-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 transition cursor-pointer ${f.style} ${
                      settings.fontFamily === f.id
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 font-semibold"
                        : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-neutral-700 dark:text-neutral-300 font-medium">Font Size</label>
                <span className="text-neutral-500 dark:text-neutral-400">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="64"
                step="1"
                value={settings.fontSize}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
              />
            </div>

            {/* Line Spacing */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-neutral-700 dark:text-neutral-300 font-medium">Line Spacing</label>
                <span className="text-neutral-500 dark:text-neutral-400">{settings.lineSpacing}x</span>
              </div>
              <input
                type="range"
                min="1.2"
                max="3.0"
                step="0.1"
                value={settings.lineSpacing}
                onChange={(e) => onUpdate({ lineSpacing: Number(e.target.value) })}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
              />
            </div>

            {/* Letter Spacing */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-neutral-700 dark:text-neutral-300 font-medium">Letter Spacing</label>
                <span className="text-neutral-500 dark:text-neutral-400">{settings.letterSpacing}em</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.25"
                step="0.01"
                value={settings.letterSpacing}
                onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section: Reading Mode Options */}
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-neutral-500 dark:text-neutral-400 text-xs tracking-wider uppercase">
              Reading Options
            </span>

            {/* Horizontal Text Alignment (only relevant when horizontal) */}
            {settings.layout === "horizontal" && (
              <div className="flex items-center justify-between py-1">
                <label className="text-neutral-700 dark:text-neutral-300 font-medium">Text Alignment</label>
                <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 border border-neutral-200/40 dark:border-neutral-700/40">
                  {(["left", "center", "right"] as TextAlignment[]).map((align) => (
                    <button
                      key={align}
                      onClick={() => onUpdate({ alignment: align })}
                      className={`px-3 py-1 text-xs rounded-md font-medium cursor-pointer transition ${
                        settings.alignment === align
                          ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                      }`}
                    >
                      {align.charAt(0).toUpperCase() + align.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Mode */}
            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-neutral-700 dark:text-neutral-300 font-medium block">Focus Mode</label>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  Fade older sentences to highlight active text
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.focusMode}
                onChange={(e) => onUpdate({ focusMode: e.target.checked })}
                className="w-9 h-5 bg-neutral-200 dark:bg-neutral-800 checked:bg-blue-600 rounded-full appearance-none relative before:content-[''] before:absolute before:h-4 before:w-4 before:bg-white before:rounded-full before:left-0.5 before:top-0.5 checked:before:translate-x-4 before:transition cursor-pointer"
              />
            </div>

            {/* Show Timestamp */}
            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-neutral-700 dark:text-neutral-300 font-medium block">Show Timestamp</label>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  Show hook time beside dialogue lines
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.showTimestamp}
                onChange={(e) => onUpdate({ showTimestamp: e.target.checked })}
                className="w-9 h-5 bg-neutral-200 dark:bg-neutral-800 checked:bg-blue-600 rounded-full appearance-none relative before:content-[''] before:absolute before:h-4 before:w-4 before:bg-white before:rounded-full before:left-0.5 before:top-0.5 checked:before:translate-x-4 before:transition cursor-pointer"
              />
            </div>

            {/* Auto Clipboard Copy */}
            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-neutral-700 dark:text-neutral-300 font-medium block">Clipboard Auto-Copy</label>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  Automatically copy incoming text to clipboard
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoCopy}
                onChange={(e) => onUpdate({ autoCopy: e.target.checked })}
                className="w-9 h-5 bg-neutral-200 dark:bg-neutral-800 checked:bg-blue-600 rounded-full appearance-none relative before:content-[''] before:absolute before:h-4 before:w-4 before:bg-white before:rounded-full before:left-0.5 before:top-0.5 checked:before:translate-x-4 before:transition cursor-pointer"
              />
            </div>
          </div>

          {/* Section: Text-to-Speech (TTS) */}
          <div className="flex flex-col gap-4">
            <span className="font-semibold text-neutral-500 dark:text-neutral-400 text-xs tracking-wider uppercase">
              Speech Synthesis (TTS)
            </span>

            {/* Auto TTS Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-neutral-700 dark:text-neutral-300 font-medium block">Auto Read Aloud</label>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  Read new sentences aloud as they hook
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoTTS}
                onChange={(e) => onUpdate({ autoTTS: e.target.checked })}
                className="w-9 h-5 bg-neutral-200 dark:bg-neutral-800 checked:bg-blue-600 rounded-full appearance-none relative before:content-[''] before:absolute before:h-4 before:w-4 before:bg-white before:rounded-full before:left-0.5 before:top-0.5 checked:before:translate-x-4 before:transition cursor-pointer"
              />
            </div>

            {/* TTS Voice dropdown */}
            {voices.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-neutral-700 dark:text-neutral-300 font-medium">TTS Voice</label>
                <select
                  value={settings.ttsVoice}
                  onChange={(e) => onUpdate({ ttsVoice: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 dark:text-neutral-200 text-xs"
                >
                  <option value="">Default System Voice</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speech Speed */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-neutral-700 dark:text-neutral-300 font-medium">Speech Speed</label>
                <span className="text-neutral-500 dark:text-neutral-400">{settings.ttsSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.ttsSpeed}
                onChange={(e) => onUpdate({ ttsSpeed: Number(e.target.value) })}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section: Gemini AI */}
          <div className="flex flex-col gap-4 border-t border-neutral-100 dark:border-neutral-800/80 pt-4">
            <span className="font-semibold text-neutral-500 dark:text-neutral-400 text-xs tracking-wider uppercase flex items-center gap-1">
              ✨ Gemini AI
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-neutral-700 dark:text-neutral-300 font-medium">Gemini API Key</label>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">Stored locally</span>
              </div>
              <input
                type="password"
                placeholder="Enter your Gemini API key"
                value={settings.geminiApiKey || ""}
                onChange={(e) => {
                  onUpdate({ geminiApiKey: e.target.value });
                  localStorage.setItem("gemini_api_key", e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 dark:text-neutral-200 text-xs"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-between items-center">
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition cursor-pointer"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
