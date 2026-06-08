"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface ClassicBook {
  id: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  coverGradient: string;
  matchScore: string;
  year: string;
}

const CLASSICS: ClassicBook[] = [
  {
    id: "sample-cat-book",
    title: "吾輩は猫である",
    author: "夏目漱石",
    genre: "Classic Novel • Satire",
    description: "A satirical masterpiece viewed through the eyes of a Nameless Cat observing human follies.",
    coverGradient: "from-[#145c43] to-[#0a2f22]",
    matchScore: "98% Match",
    year: "1905",
  },
  {
    id: "sample-melos-book",
    title: "走れメロス",
    author: "太宰治",
    genre: "Classic Novel • Drama",
    description: "A timeless tale of friendship, trust, and a man's race against time to save his host companion.",
    coverGradient: "from-[#9a1c1c] to-[#3b0707]",
    matchScore: "95% Match",
    year: "1940",
  },
  {
    id: "silver-spoon",
    title: "銀の匙",
    author: "中勘助",
    genre: "Memoir • Nostalgia",
    description: "A beautifully descriptive memoir of childhood, school years, and the magic of small discoveries.",
    coverGradient: "from-[#1e3a8a] to-[#0f172a]",
    matchScore: "91% Match",
    year: "1913",
  },
  {
    id: "galactic-railroad",
    title: "銀河鉄道の夜",
    author: "宮沢賢治",
    genre: "Fantasy • Philosophical",
    description: "A dreamlike journey through the stars exploring life, sacrifice, and true happiness.",
    coverGradient: "from-[#581c87] to-[#1e1b4b]",
    matchScore: "94% Match",
    year: "1934",
  },
];

export default function Home() {
  const [showIntro, setShowIntro] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<ClassicBook | null>(null);

  useEffect(() => {
    // Play intro only once per session
    const hasSeenIntro = sessionStorage.getItem("japanos-seen-intro");
    if (!hasSeenIntro) {
      setShowIntro(true);
      sessionStorage.setItem("japanos-seen-intro", "true");
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 3200); // Intro lasts ~3s
      return () => clearTimeout(timer);
    }
  }, []);

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] overflow-hidden select-none">
        <style jsx global>{`
          @keyframes tudum-logo {
            0% {
              transform: scale(0.6);
              opacity: 0;
              letter-spacing: -10px;
              filter: blur(10px);
            }
            15% {
              transform: scale(1.02);
              opacity: 1;
              letter-spacing: 2px;
              filter: blur(0px);
            }
            75% {
              transform: scale(1);
              opacity: 1;
              letter-spacing: 0px;
              filter: blur(0px);
            }
            100% {
              transform: scale(1.6);
              opacity: 0;
              letter-spacing: 4px;
              filter: blur(4px);
            }
          }
          @keyframes tudum-glow {
            0% { text-shadow: 0 0 0px rgba(229, 9, 20, 0); }
            30% { text-shadow: 0 0 30px rgba(229, 9, 20, 0.8), 0 0 50px rgba(229, 9, 20, 0.4); }
            70% { text-shadow: 0 0 40px rgba(229, 9, 20, 0.9), 0 0 70px rgba(229, 9, 20, 0.5); }
            100% { text-shadow: 0 0 0px rgba(229, 9, 20, 0); }
          }
          .tudum-animate {
            animation: tudum-logo 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          .tudum-glow-animate {
            animation: tudum-glow 3.2s ease-in-out forwards;
          }
        `}</style>
        <div className="flex flex-col items-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#E50914] font-sans tudum-animate tudum-glow-animate">
            JAPANOS
          </h1>
          <p className="text-[9px] font-mono tracking-widest text-zinc-550 uppercase mt-4 animate-pulse">
            Booting Immersion Workspace v2.0...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#141414] text-[#E5E5E5] min-h-screen relative pb-16">
      {/* 1. Hero Billboard Banner */}
      <section className="relative w-full h-[70vh] md:h-[85vh] flex items-center px-6 md:px-12 overflow-hidden">
        {/* Billboard Background image & gradient overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center select-none pointer-events-none"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1920')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/10 to-black/30 z-10" />

        {/* Billboard Content */}
        <div className="max-w-2xl z-20 flex flex-col gap-4 mt-12 md:mt-20">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white font-extrabold text-[9px] tracking-widest px-1.5 py-0.5 rounded uppercase font-sans">
              N
            </span>
            <span className="text-xs font-semibold text-zinc-350 tracking-wider font-mono">
              JAPANOS ORIGINAL SYSTEM
            </span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase drop-shadow-lg leading-tight font-sans">
            Video Immersion
          </h2>

          <div className="flex items-center gap-3 text-xs md:text-sm font-semibold">
            <span className="text-emerald-400 font-bold">98% Match</span>
            <span className="text-zinc-300">2026</span>
            <span className="border border-zinc-500/50 px-1.5 py-0.2 rounded text-[10px] text-zinc-400 font-mono">
              HD
            </span>
            <span className="text-zinc-400">Subtitle Lookups</span>
          </div>

          <p className="text-sm md:text-base text-zinc-300 leading-relaxed drop-shadow max-w-lg">
            Stream local video files with fully interactive subtitle tracks. Hover words while holding Shift to look up definitions instantly, synchronize subtitles, and auto-export to your Anki notebook.
          </p>

          <div className="flex items-center gap-3 mt-4">
            <Link
              href="/video-player"
              className="bg-white hover:bg-zinc-200 text-black font-bold px-6 py-2.5 rounded-md flex items-center justify-center gap-2 transition-all duration-300 text-sm shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Play Player
            </Link>

            <button
              onClick={() => setInfoModalOpen(true)}
              className="bg-zinc-550/40 hover:bg-zinc-550/60 text-white font-bold px-6 py-2.5 rounded-md flex items-center justify-center gap-2 transition-all duration-300 text-sm border border-zinc-700 backdrop-blur-sm shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              More Info
            </button>
          </div>
        </div>
      </section>

      {/* 2. Horizontal Scrolling Card Rows */}
      <div className="relative px-6 md:px-12 -mt-16 md:-mt-24 z-30 flex flex-col gap-10">
        
        {/* Row 1: Continue Immersion (Our Main Tools) */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-wide">Continue Learning</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Ebook Card */}
            <Link
              href="/reader"
              className="group relative h-48 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 shadow-lg cursor-pointer transform hover:scale-[1.03] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent z-10" />
              <div
                className="absolute inset-0 bg-cover bg-center opacity-65 group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600')",
                }}
              />
              <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-widest uppercase">Ebook Reader</span>
                </div>
                <h4 className="text-base font-bold text-white truncate">読書 Ebook Library</h4>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1 border border-zinc-900/50">
                  <div className="bg-[#E50914] h-1.5 rounded-full" style={{ width: "68%" }} />
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">68% completed • Resume Reading</span>
              </div>
            </Link>

            {/* Video Player Card */}
            <Link
              href="/video-player"
              className="group relative h-48 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 shadow-lg cursor-pointer transform hover:scale-[1.03] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent z-10" />
              <div
                className="absolute inset-0 bg-cover bg-center opacity-65 group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=600')",
                }}
              />
              <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-violet-400 font-mono tracking-widest uppercase">Video Player</span>
                </div>
                <h4 className="text-base font-bold text-white truncate">動画 Media Immersion</h4>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1 border border-zinc-900/50">
                  <div className="bg-[#E50914] h-1.5 rounded-full" style={{ width: "42%" }} />
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">42% completed • Resume Watching</span>
              </div>
            </Link>

            {/* Texthooker Card */}
            <Link
              href="/texthooker"
              className="group relative h-48 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 shadow-lg cursor-pointer transform hover:scale-[1.03] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent z-10" />
              <div
                className="absolute inset-0 bg-cover bg-center opacity-65 group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600')",
                }}
              />
              <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-extrabold text-[8px] tracking-wider uppercase">LIVE</span>
                  <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase">Texthooker</span>
                </div>
                <h4 className="text-base font-bold text-white truncate">テキストフッカー Hook Client</h4>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[10px] text-zinc-400 font-medium">WebSocket Listening (ws://localhost:6677)</span>
                </div>
              </div>
            </Link>

          </div>
        </div>

        {/* Row 2: Popular Classics (Ebooks) */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-wide">Popular Classics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CLASSICS.map((book) => (
              <div
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className="group relative aspect-[2/3] rounded bg-gradient-to-br border border-zinc-900 hover:border-zinc-700 cursor-pointer overflow-hidden transform hover:scale-[1.04] transition-all duration-300 shadow-lg"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${book.coverGradient} opacity-90`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                <div className="absolute inset-0 p-4 z-20 flex flex-col justify-between">
                  <div className="text-[7px] font-mono text-zinc-400 tracking-widest uppercase">CLASSIC IMMERSION</div>
                  
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-base md:text-lg font-serif font-black text-white leading-tight line-clamp-3">
                      {book.title}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-medium">{book.author}</p>
                  </div>
                </div>

                {/* Hover overlay details */}
                <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 p-4 flex flex-col justify-between text-xs">
                  <div className="flex flex-col gap-2">
                    <h5 className="font-bold text-white text-sm">{book.title}</h5>
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-400">
                      <span>{book.matchScore}</span>
                      <span className="text-zinc-500">{book.year}</span>
                    </div>
                    <p className="text-[11px] text-zinc-450 leading-relaxed line-clamp-4">{book.description}</p>
                  </div>
                  <Link
                    href={`/reader?bookId=${book.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-[#E50914] text-white hover:bg-red-700 py-1.5 rounded font-bold text-center text-[11px] transition duration-200"
                  >
                    Start Reading
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Workspace Original Features */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-wide">Immersion Features</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Shift+Hover Yomichan Lookup",
                desc: "Hover over any Japanese word while holding the Shift key to fetch instant dictionary definitions.",
                icon: "🔍",
              },
              {
                title: "Local Textractor Websockets",
                desc: "Automatically streams dialog from local visual novels through local websocket hook integration.",
                icon: "⚡",
              },
              {
                title: "Tategaki Vertical Mode",
                desc: "Switch the ebook reader instantly between traditional vertical layout and standard horizontal layout.",
                icon: "✍️",
              },
              {
                title: "Anki Vocabulary Exporter",
                desc: "Add flagged lookup words to your local vocabulary notebook and export them to Anki CSV files easily.",
                icon: "📇",
              },
            ].map((f, i) => (
              <div key={i} className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-5 flex flex-col gap-2.5">
                <span className="text-2xl">{f.icon}</span>
                <h4 className="text-sm font-bold text-white">{f.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Info Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 text-sm text-zinc-300 relative shadow-2xl">
            <button
              onClick={() => setInfoModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="text-xl font-bold text-white mb-3">About JapanOS Immersion Hub</h3>
            <p className="leading-relaxed mb-4">
              JapanOS is a custom-built, premium language immersion dashboard. By integrating local media reading, video playing, and text hookers, it allows seamless workflow in one window.
            </p>
            <ul className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
              <li className="flex items-center gap-2">
                <span className="text-red-500">✔</span>
                <span>Responsive vertical ebook reading</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✔</span>
                <span>Dynamic local SRT/VTT file sync for videos</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✔</span>
                <span>Automatic clipboard copy & Speech Synthesis</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Book Info / Quick Read Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <div className={`h-40 bg-gradient-to-br ${selectedBook.coverGradient} flex flex-col justify-end p-6 relative`}>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-black/40 p-1.5 rounded-full transition cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="text-[9px] font-mono text-zinc-400 tracking-widest uppercase z-10">BOOK HIGHLIGHT</span>
              <h3 className="text-2xl font-serif font-black text-white leading-tight mt-1 z-10">{selectedBook.title}</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-bold">{selectedBook.matchScore}</span>
                <span className="text-zinc-400">{selectedBook.author}</span>
                <span className="text-zinc-500">{selectedBook.year}</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{selectedBook.description}</p>
              <div className="flex gap-3 mt-2">
                <Link
                  href={`/reader?bookId=${selectedBook.id}`}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-2.5 rounded text-center text-xs transition duration-200"
                >
                  Read Now
                </Link>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded text-center text-xs border border-zinc-700 transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
