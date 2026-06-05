"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface UseWebSocketProps {
  url: string;
  onTextReceived: (text: string, threadName?: string) => void;
  enabled?: boolean;
}

export function useWebSocket({ url, onTextReceived, enabled = true }: UseWebSocketProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onTextReceivedRef = useRef(onTextReceived);

  // Keep callback reference updated to avoid socket reconnects when it changes
  useEffect(() => {
    onTextReceivedRef.current = onTextReceived;
  }, [onTextReceived]);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing socket if any
    if (socketRef.current) {
      socketRef.current.close();
    }

    setStatus("connecting");
    setError(null);

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("connected");
        setError(null);
      };

      socket.onmessage = (event) => {
        const rawData = event.data;
        if (!rawData) return;

        try {
          const parsed = JSON.parse(rawData);
          if (parsed && typeof parsed === "object") {
            // Textractor WebSocket extensions typically send either:
            // 1. Raw text
            // 2. JSON: { text: "...", name: "..." }
            // 3. JSON: { sentence: "...", name: "..." }
            const text = parsed.text || parsed.sentence || parsed.string || JSON.stringify(parsed);
            const threadName = parsed.name || parsed.threadName || parsed.thread || undefined;
            onTextReceivedRef.current(text, threadName);
          } else {
            onTextReceivedRef.current(rawData);
          }
        } catch {
          // If it fails to parse as JSON, treat it as raw text
          onTextReceivedRef.current(rawData);
        }
      };

      socket.onclose = (event) => {
        setStatus("disconnected");
        // Only reconnect if not closed intentionally
        if (enabled && !event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000); // retry in 3 seconds
        }
      };

      socket.onerror = () => {
        setError("Connection failed. Ensure Textractor and its WebSocket extension are active.");
        setStatus("disconnected");
      };
    } catch (e: any) {
      setError(e.message || "Invalid WebSocket URL");
      setStatus("disconnected");
    }
  }, [url, enabled]);

  // Handle active toggle
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setStatus("disconnected");
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, connect]);

  // Manual reconnect trigger
  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  // Inject mock messages (extremely useful for development & demonstration)
  const injectMockMessage = useCallback((text: string, threadName: string = "Mock Game Thread") => {
    onTextReceivedRef.current(text, threadName);
  }, []);

  return {
    status,
    error,
    reconnect,
    injectMockMessage,
  };
}
