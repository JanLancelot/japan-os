"use client";

import { useState, useEffect } from "react";
import { ReaderSettings, ReaderTheme, FontFamily, TextAlignment } from "../types";

const STORAGE_KEY = "texthooker-settings-v1";

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "dark",
  layout: "horizontal",
  alignment: "left",
  fontSize: 24,
  lineSpacing: 1.8,
  letterSpacing: 0.04,
  fontFamily: "serif",
  focusMode: false,
  autoCopy: false,
  autoTTS: false,
  ttsVoice: "",
  ttsSpeed: 1.0,
  showTimestamp: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Update settings and write to localStorage
  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save settings to localStorage", e);
      }
      return updated;
    });
  };

  return {
    settings,
    updateSettings,
    isLoaded,
  };
}
