"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Book } from "../features/reader/types";
import { getAllBooks } from "../features/reader/utils/db";

// Constants
const INTRO_DURATION_MS = 3200;
const WEBSOCKET_URL = "ws://localhost:6677";

const UNSPLASH_IMAGES = {
  ebookLibrary: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600",
  mangaReader: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600",
  mediaImmersion: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=600",
  hookClient: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600",
};

// Reusable Components

interface IntroOverlayProps {
  durationMs: number;
}

function IntroOverlay({ durationMs }: IntroOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] overflow-hidden select-none">
      <div className="flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#E50914] font-sans tudum-animate tudum-glow-animate">
          JAPANOS
        </h1>
        <p className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase mt-4 animate-pulse">
          Booting Immersion Workspace v2.0...
        </p>
      </div>
    </div>
  );
}

interface ToolCardProps {
  icon: string;
  tagText: string;
  tagColorClass: string;
  title: string;
  description: string;
  statusText: React.ReactNode;
  actionHref: string;
  actionText: string;
  actionId: string;
  backgroundImageUrl: string;
}

function ToolCard({
  icon,
  tagText,
  tagColorClass,
  title,
  description,
  statusText,
  actionHref,
  actionText,
  actionId,
  backgroundImageUrl,
}: ToolCardProps) {
  return (
    <div className="group relative h-60 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-900 hover:border-zinc-800 shadow-xl flex flex-col justify-between p-5 transition duration-300">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent z-10" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-500"
        style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
      />
      
      <div className="z-20 flex items-center justify-between w-full">
        <span className="text-2xl">{icon}</span>
        <span className={`text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border ${tagColorClass}`}>
          {tagText}
        </span>
      </div>

      <div className="z-20 flex flex-col gap-1 mt-4">
        <h3 className="text-base font-extrabold text-white">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="z-20 flex items-center justify-between border-t border-zinc-900/80 pt-3 mt-3 w-full">
        <span className="text-[10px] text-zinc-550 font-mono">
          {statusText}
        </span>
        <Link
          id={actionId}
          href={actionHref}
          className="bg-white hover:bg-zinc-200 text-black font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition duration-300 shadow-md"
        >
          {actionText}
        </Link>
      </div>
    </div>
  );
}

interface WorkspaceTipCardProps {
  icon: string;
  title: string;
  description: React.ReactNode;
}

function WorkspaceTipCard({ icon, title, description }: WorkspaceTipCardProps) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 flex flex-col gap-3 shadow-md backdrop-blur-sm hover:border-zinc-800 transition duration-300">
      <div className="flex items-center gap-2.5">
        <span className="text-lg text-violet-400">{icon}</span>
        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans">
          {title}
        </h4>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-lg w-full p-6 text-sm text-zinc-300 relative shadow-2xl">
        <button
          id="btn-close-info-modal"
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-white mb-2 tracking-wide font-sans">
          About JapanOS Immersion Hub
        </h3>
        <p className="leading-relaxed mb-4 text-xs text-zinc-400">
          JapanOS is a custom-built, premium language immersion dashboard. By
          integrating local media reading, video playing, and text hookers, it
          allows seamless workflow in one window.
        </p>
        <ul className="flex flex-col gap-2.5 border-t border-zinc-900 pt-4 text-xs">
          <li className="flex items-center gap-2 text-zinc-350">
            <span className="text-emerald-500">✔</span>
            <span>Responsive vertical ebook reading with bookmarks</span>
          </li>
          <li className="flex items-center gap-2 text-zinc-350">
            <span className="text-emerald-500">✔</span>
            <span>Dynamic local SRT/VTT file sync for videos</span>
          </li>
          <li className="flex items-center gap-2 text-zinc-350">
            <span className="text-emerald-500">✔</span>
            <span>Automatic clipboard copy & speech synthesis</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Play intro only once per session
    const hasSeenIntro = sessionStorage.getItem("japanos-seen-intro");
    if (!hasSeenIntro) {
      setShowIntro(true);
      sessionStorage.setItem("japanos-seen-intro", "true");
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, INTRO_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, []);

  // Load Ebooks data from IndexedDB
  const loadDBData = async () => {
    try {
      const allBooks = await getAllBooks();
      setBooks(allBooks);
      setDbLoaded(true);
    } catch (err) {
      console.error("Failed to load IndexedDB data on onboarding:", err);
      setDbLoaded(true);
    }
  };

  useEffect(() => {
    loadDBData();
  }, []);

  // Prevent hydration flash by rendering empty matching background container initially
  if (!isMounted) {
    return <div className="min-h-screen bg-[#09090b]" />;
  }

  if (showIntro) {
    return <IntroOverlay durationMs={INTRO_DURATION_MS} />;
  }

  return (
    <div className="flex-1 bg-[#09090b] text-[#E5E5E5] min-h-screen relative pb-16 overflow-y-auto pt-20">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#E50914]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-violet-900/5 blur-[130px] pointer-events-none" />

      {/* Main SaaS Onboarding Workspace */}
      <main className="max-w-5xl mx-auto px-6 md:px-12 flex flex-col gap-10 relative z-10">
        
        {/* Onboarding Welcome Section */}
        <section className="text-center flex flex-col items-center gap-4 py-6 border-b border-zinc-900 pb-8">
          <span className="bg-[#E50914]/10 border border-[#E50914]/30 text-[#E50914] font-extrabold text-[10px] tracking-widest px-3 py-1 rounded-full uppercase font-sans shadow-[0_0_15px_rgba(229,9,20,0.1)]">
            Welcome to JapanOS
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-sans mt-2 max-w-2xl leading-tight">
            Your Ultimate Japanese <span className="text-[#E50914]">Immersion Hub</span>
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
            Configure your environment and start engaging with native text and video workspaces.
          </p>
        </section>

        {/* Step 1: Immersion Workspaces */}
        <section className="flex flex-col gap-5 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 font-mono">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-sans">Launch an Immersion Tool</h2>
              <p className="text-xs text-zinc-500">
                Launch any of our built-in workspaces to begin reading, watching, or hooking content.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">
            
            {/* Ebook Card */}
            <ToolCard
              icon="📖"
              tagText="Ebook Reader"
              tagColorClass="text-emerald-400 bg-emerald-950/40 border-emerald-900/40"
              title="読書 Ebook Library"
              description="Read traditional vertical text layouts, upload custom EPUB/TXT novels, and hover words for Yomichan-style lookup definitions."
              statusText={dbLoaded ? `${books.length} novels loaded` : "Loading library..."}
              actionHref="/reader"
              actionText="Open Reader"
              actionId="btn-open-reader"
              backgroundImageUrl={UNSPLASH_IMAGES.ebookLibrary}
            />

            {/* Manga Reader Card */}
            <ToolCard
              icon="🎨"
              tagText="Manga Reader"
              tagColorClass="text-violet-400 bg-violet-950/40 border-violet-900/40"
              title="漫画 Manga Reader"
              description="Read manga ZIP volumes/folders with client-side vertical OCR overlays."
              statusText="Text scanning active"
              actionHref="/manga-reader"
              actionText="Open Reader"
              actionId="btn-open-manga"
              backgroundImageUrl={UNSPLASH_IMAGES.mangaReader}
            />

            {/* Video Player Card */}
            <ToolCard
              icon="🎬"
              tagText="Video Player"
              tagColorClass="text-violet-400 bg-violet-950/40 border-violet-900/40"
              title="動画 Media Immersion"
              description="Synchronize SRT subtitles with local video files, click dialog lines to lookup words instantly, and build your vocabulary notebook."
              statusText="Interactive Subtitles"
              actionHref="/video-player"
              actionText="Open Player"
              actionId="btn-open-video"
              backgroundImageUrl={UNSPLASH_IMAGES.mediaImmersion}
            />

            {/* Texthooker Card */}
            <ToolCard
              icon="⚡"
              tagText="Texthooker"
              tagColorClass="text-red-400 bg-red-950/40 border-red-900/40"
              title="テキストフッカー Hook Client"
              description="Auto-capture text lines from running visual novels or OCR software via WebSocket clipboard monitoring, and read aloud."
              statusText={
                <span className="text-red-500 font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  {WEBSOCKET_URL}
                </span>
              }
              actionHref="/texthooker"
              actionText="Open Hooker"
              actionId="btn-open-hooker"
              backgroundImageUrl={UNSPLASH_IMAGES.hookClient}
            />

          </div>
        </section>

        {/* Step 2: Pro Tips & Learn More */}
        <section className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 font-mono">
              2
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-sans">Workspace Tips & Setup</h2>
              <p className="text-xs text-zinc-500">Quick guides to help you maximize your immersion efficiency inside JapanOS.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
            
            {/* Tip 1 */}
            <WorkspaceTipCard
              icon="💡"
              title="Interactive Yomichan"
              description={
                <>
                  Hold{" "}
                  <kbd className="bg-zinc-900 text-zinc-200 border border-zinc-800 px-1 py-0.5 rounded font-mono text-[9px]">
                    Shift
                  </kbd>{" "}
                  and hover over kanji inside Ebooks or Video subtitles for
                  instant dictionary popups and audio.
                </>
              }
            />

            {/* Tip 2 */}
            <WorkspaceTipCard
              icon="🔊"
              title="Automated Speech"
              description="Enable text-to-speech in the Live Texthooker settings page to automatically read visual novel clipboard contents aloud as they hook."
            />

            {/* Help CTA */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-md backdrop-blur-sm hover:border-zinc-800 transition duration-300">
              <div>
                <h4 className="text-xs font-bold text-zinc-350 uppercase tracking-wider font-sans">
                  Need Help?
                </h4>
                <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                  Learn more about offline dictionaries and setting up your first workspace.
                </p>
              </div>
              <button
                id="btn-learn-more"
                onClick={() => setInfoModalOpen(true)}
                className="w-full text-center bg-zinc-900 hover:bg-zinc-850 text-zinc-350 hover:text-white border border-zinc-800 font-semibold text-xs py-2 rounded-xl transition duration-200 cursor-pointer shadow-sm"
              >
                Learn More
              </button>
            </div>

          </div>
        </section>

      </main>

      {/* Info Modal */}
      <AboutModal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
    </div>
  );
}
