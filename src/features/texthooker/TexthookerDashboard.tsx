"use client";

import React, { useState, useEffect } from "react";
import { useSettings } from "./hooks/useSettings";
import { useTextHistory } from "./hooks/useTextHistory";
import { useTTS } from "./hooks/useTTS";
import { useWebSocket } from "./hooks/useWebSocket";

import { ConnectionStatus } from "./components/ConnectionStatus";
import { ControlBar } from "./components/ControlBar";
import { HistoryPanel } from "./components/HistoryPanel";
import { Reader } from "./components/Reader";
import { SettingsModal } from "./components/SettingsModal";
import { WordLookup } from "./components/WordLookup";

export function TexthookerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Custom WebSocket URL state (separate or read/write settings)
  const [wsUrl, setWsUrl] = useState("ws://localhost:6677");
  const [wsEnabled, setWsEnabled] = useState(true);

  // Custom Hooks
  const { settings, updateSettings, resetSettings, isLoaded: settingsLoaded } = useSettings();
  const { 
    history, 
    addSentence, 
    removeSentence, 
    updateSentence, 
    clearHistory, 
    isLoaded: historyLoaded 
  } = useTextHistory();
  const { voices, speak, stop: stopTTS } = useTTS();

  // Load wsUrl from local storage on client mount
  useEffect(() => {
    setMounted(true);
    const storedUrl = localStorage.getItem("texthooker-ws-url");
    if (storedUrl) {
      setWsUrl(storedUrl);
    }
  }, []);

  const handleUrlChange = (newUrl: string) => {
    setWsUrl(newUrl);
    localStorage.setItem("texthooker-ws-url", newUrl);
  };

  // WebSocket message handler
  const handleTextReceived = (text: string, threadName?: string) => {
    // 1. Add to local history list
    addSentence(text, threadName);

    // 2. Clipboard integration (Auto Copy)
    if (settings.autoCopy) {
      navigator.clipboard.writeText(text).catch((err) => {
        console.error("Failed to copy text to clipboard:", err);
      });
    }

    // 3. TTS integration (Auto Read Aloud)
    if (settings.autoTTS) {
      speak(text, settings.ttsVoice, settings.ttsSpeed);
    }
  };

  const { status, error, reconnect, injectMockMessage } = useWebSocket({
    url: wsUrl,
    onTextReceived: handleTextReceived,
    enabled: wsEnabled,
  });

  const handleSpeakLine = (text: string) => {
    speak(text, settings.ttsVoice, settings.ttsSpeed);
  };

  const handleToggleConnection = () => {
    setWsEnabled((prev) => !prev);
  };

  // Wait for client-side mount and settings/history load to prevent SSR hydration mismatch
  if (!mounted || !settingsLoaded || !historyLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-neutral-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-neutral-800 animate-spin" />
          <span className="text-xs font-medium tracking-wide">Loading Texthooker UI...</span>
        </div>
      </div>
    );
  }

  // Theme translation to css styling classes
  const getThemeWrapperClass = () => {
    switch (settings.theme) {
      case "light":
        return "bg-zinc-50 text-zinc-900";
      case "sepia":
        return "bg-[#fcf8ed] text-[#433422]";
      case "dark":
        return "dark bg-zinc-950 text-zinc-100";
      case "midnight":
      default:
        return "dark bg-black text-neutral-300";
    }
  };

  const getReaderContainerTheme = () => {
    switch (settings.theme) {
      case "light":
        return "bg-white border-zinc-200/50";
      case "sepia":
        return "bg-[#f4ebd0] border-[#d5c396]/40";
      case "dark":
        return "bg-zinc-900/40 border-zinc-800/40";
      case "midnight":
      default:
        return "bg-neutral-900/10 border-neutral-900";
    }
  };

  return (
    <div className={`flex flex-col flex-1 h-screen w-screen overflow-hidden transition-colors duration-500 relative ${getThemeWrapperClass()}`}>
      
      {/* Main Content Area - Full screen, no padding */}
      <main className="flex-1 w-full h-full overflow-hidden relative flex flex-col">
        
        {/* Reader Core Screen - Fills the entire page */}
        <Reader 
          history={history} 
          settings={settings} 
          onSpeak={handleSpeakLine} 
        />

        {/* Floating Dock Control Bar */}
        <ControlBar
          settings={settings}
          onUpdateSettings={updateSettings}
          status={status}
          onToggleConnection={handleToggleConnection}
          onToggleHistory={() => setHistoryOpen(!historyOpen)}
          onOpenSettings={() => setSettingsOpen(true)}
          onClearHistory={clearHistory}
          historyCount={history.length}
        />
      </main>

      {/* Slide-in History Panel */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onDeleteLine={removeSentence}
        onEditLine={updateSentence}
        onClearHistory={clearHistory}
        onSpeak={handleSpeakLine}
        showTimestamp={settings.showTimestamp}
      />

      {/* Detailed Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
        onReset={resetSettings}
        voices={voices}
        status={status}
        url={wsUrl}
        error={error}
        onUrlChange={handleUrlChange}
        onReconnect={reconnect}
        onMockTrigger={injectMockMessage}
      />

      {/* Floating Word Lookup Popover */}
      <WordLookup onSpeak={handleSpeakLine} />

    </div>
  );
}

