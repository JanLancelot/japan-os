"use client";

import React, { useState } from "react";
import { ConnectionStatus as WSStatus } from "../hooks/useWebSocket";
import { RefreshIcon } from "./Icons";

interface ConnectionStatusProps {
  status: WSStatus;
  url: string;
  error: string | null;
  onUrlChange: (url: string) => void;
  onReconnect: () => void;
  onMockTrigger: (text: string) => void;
}

const MOCK_PHRASES = [
  "俺は本当に、この世界に来てよかったと思っている。",
  "ねえ、聞こえてる？　私の、この声が――",
  "運命なんて、自分で変えてみせるさ！",
  "桜の花びらが、風に舞って綺麗だね。",
  "また明日、ここで会おう。約束だよ。",
  "不思議なこともあるものですね。まるで夢のようです。",
  "前を向いて歩こう。きっと、道は開けるから。",
  "お帰りなさいませ、ご主人様！",
  "やはり、君はあの時の女の子だったんだね。"
];

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  url,
  error,
  onUrlChange,
  onReconnect,
  onMockTrigger,
}) => {
  const [editingUrl, setEditingUrl] = useState(url);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUrlChange(editingUrl);
    setIsEditing(false);
  };

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "bg-emerald-500 shadow-emerald-500/30";
      case "connecting":
        return "bg-amber-500 shadow-amber-500/30 animate-pulse";
      case "disconnected":
      default:
        return "bg-rose-500 shadow-rose-500/30";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
      default:
        return "Disconnected";
    }
  };

  const handleRandomMock = () => {
    const randomIndex = Math.floor(Math.random() * MOCK_PHRASES.length);
    onMockTrigger(MOCK_PHRASES[randomIndex]);
  };

  return (
    <div className="w-full flex flex-col gap-2 p-4 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/40 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${getStatusColor()}`} />
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {getStatusText()}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 select-none">
            ws://localhost:6677
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingUrl(url);
                  setIsEditing(false);
                }}
                className="px-2.5 py-1 text-xs rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Change Port/URL
              </button>
              <button
                onClick={onReconnect}
                title="Reconnect"
                className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <RefreshIcon size={14} />
              </button>
            </>
          )}

          <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-800 mx-1" />

          <button
            onClick={handleRandomMock}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
          >
            + Inject Sim Dialogue
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-600 dark:text-rose-400/90 font-medium">
          {error}
        </div>
      )}
    </div>
  );
};
