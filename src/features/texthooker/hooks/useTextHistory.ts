"use client";

import { useState, useEffect } from "react";
import { HookedSentence } from "../types";

const HISTORY_KEY = "texthooker-history-v1";

export function useTextHistory() {
  const [history, setHistory] = useState<HookedSentence[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save history helper
  const saveHistory = (newHistory: HookedSentence[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  };

  // Add a new sentence to history
  const addSentence = (text: string, threadName?: string): HookedSentence => {
    const newSentence: HookedSentence = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      text: text.trim(),
      timestamp: Date.now(),
      threadName,
    };

    setHistory((prev) => {
      // Avoid duplicate consecutive sentences if they are identical
      if (prev.length > 0 && prev[prev.length - 1].text === newSentence.text) {
        return prev;
      }
      const updated = [...prev, newSentence];
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save history to localStorage", e);
      }
      return updated;
    });

    return newSentence;
  };

  // Remove a sentence by id
  const removeSentence = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
  };

  // Edit/update a sentence by id
  const updateSentence = (id: string, newText: string) => {
    const updated = history.map((item) =>
      item.id === id ? { ...item, text: newText } : item
    );
    saveHistory(updated);
  };

  // Clear all history
  const clearHistory = () => {
    saveHistory([]);
  };

  // Import history
  const importHistory = (imported: HookedSentence[]) => {
    saveHistory(imported);
  };

  return {
    history,
    addSentence,
    removeSentence,
    updateSentence,
    clearHistory,
    importHistory,
    isLoaded,
  };
}
