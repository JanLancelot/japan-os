"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useTTS() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Load voices on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;

      const loadVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        // Filter for Japanese voices mainly, but keep others as fallback
        const jaVoices = allVoices.filter((v) => v.lang.startsWith("ja"));
        setVoices(jaVoices.length > 0 ? jaVoices : allVoices);
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string, voiceName?: string, speed: number = 1.0) => {
      if (!synthRef.current) return;

      // Stop any current speech
      synthRef.current.cancel();

      // Clean the text from any typical formatting or noise if needed
      const cleanText = text.trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "ja-JP";
      utterance.rate = speed;

      // Find selected voice
      const allVoices = synthRef.current.getVoices();
      const selectedVoice = allVoices.find((v) => v.name === voiceName) || 
                           allVoices.find((v) => v.lang.startsWith("ja"));
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    },
    []
  );

  return {
    voices,
    speak,
    stop,
    isSpeaking,
  };
}
