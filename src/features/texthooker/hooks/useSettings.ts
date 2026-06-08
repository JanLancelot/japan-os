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
  geminiApiKey: "",
};

export function useSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const sharedKey = typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") || "" : "";
      const globalTheme = typeof window !== "undefined" ? localStorage.getItem("japanos-global-theme") || "dark" : "dark";
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ 
          ...DEFAULT_SETTINGS, 
          ...parsed, 
          theme: globalTheme as any,
          geminiApiKey: parsed.geminiApiKey || sharedKey 
        });
      } else {
        setSettings({ 
          ...DEFAULT_SETTINGS, 
          theme: globalTheme as any,
          geminiApiKey: sharedKey 
        });
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Sync with global theme changes
  useEffect(() => {
    const syncTheme = () => {
      const globalTheme = localStorage.getItem("japanos-global-theme") || "dark";
      setSettings((prev) => ({ ...prev, theme: globalTheme as any }));
    };
    window.addEventListener("japanos-theme-change", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("japanos-theme-change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  // Update settings and write to localStorage
  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    if (newSettings.theme) {
      localStorage.setItem("japanos-global-theme", newSettings.theme);
      window.dispatchEvent(new Event("japanos-theme-change"));
    }
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

  // Reset settings to defaults
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
      console.error("Failed to reset settings in localStorage", e);
    }
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}
