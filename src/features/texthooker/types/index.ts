export interface HookedSentence {
  id: string;
  text: string;
  timestamp: number;
  threadName?: string;
}

export type ReaderTheme = "light" | "dark" | "sepia" | "midnight";
export type FontFamily = "serif" | "sans" | "rounded";
export type TextAlignment = "left" | "center" | "right";

export interface ReaderSettings {
  theme: ReaderTheme;
  layout: "horizontal" | "vertical";
  alignment: TextAlignment;
  fontSize: number; // in pixels
  lineSpacing: number; // multiplier, e.g. 1.8
  letterSpacing: number; // in em, e.g. 0.05
  fontFamily: FontFamily;
  focusMode: boolean;
  autoCopy: boolean;
  autoTTS: boolean;
  ttsVoice: string;
  ttsSpeed: number;
  showTimestamp: boolean;
  geminiApiKey?: string;
}
