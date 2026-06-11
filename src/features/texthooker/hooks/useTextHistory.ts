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

  // Save history on history changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history, isLoaded]);

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
      let updated = [...prev, newSentence];
      if (updated.length > 500) {
        updated = updated.slice(updated.length - 500);
      }
      return updated;
    });

    return newSentence;
  };

  // Remove a sentence by id
  const removeSentence = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  // Edit/update a sentence by id
  const updateSentence = (id: string, newText: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
  };

  // Import history
  const importHistory = (imported: HookedSentence[]) => {
    setHistory(imported);
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
