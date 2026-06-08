import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "JapanOS - Learning Workspace",
  description: "A premium Japanese reading and language learning OS. Features a native Japanese vertical EPUB library and a Textractor WebSocket texthooker.",
};

export default function Home() {
  return (
    <div className="flex-1 flex flex-col justify-between bg-black text-neutral-300 font-sans min-h-screen relative overflow-hidden select-none">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />
      
      {/* Header */}
      <header className="px-6 py-6 md:px-12 flex items-center justify-between border-b border-neutral-900/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/10 font-serif">
            和
          </div>
          <span className="font-bold tracking-tight text-zinc-100 font-sans text-sm">JapanOS</span>
        </div>
        <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">workspace v1.0</span>
      </header>

      {/* Main dashboard hub grid */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl w-full mx-auto px-6 py-12 md:py-20 z-10">
        
        {/* Title */}
        <div className="text-center md:text-left mb-12 md:mb-16 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-sans leading-tight">
            Elevate Your Japanese <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Reading & Learning</span>
          </h2>
          <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
            A cohesive space designed for immersion. Manage and read your EPUB novels in vertical format, or stream text from visual novels using Textractor hooks with real-time dictionary lookups.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Card 1: Library & Vertical Reader */}
          <Link
            href="/library"
            className="group relative flex flex-col justify-between rounded-3xl border border-neutral-900 bg-neutral-950/40 p-8 hover:bg-neutral-900/40 hover:border-neutral-800 transition-all duration-500 shadow-lg cursor-pointer transform hover:-translate-y-1 hover:shadow-2xl"
          >
            {/* Hover card glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/30 border border-blue-900/30 flex items-center justify-center text-blue-400 shadow-inner group-hover:scale-105 transition-transform">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-bold text-zinc-100 font-sans group-hover:text-white transition-colors">
                  小説 Library & Reader
                </h3>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                  Upload EPUB novels and read in authentic right-to-left, top-to-bottom vertical columns.
                </p>
              </div>

              {/* Bullet Features */}
              <ul className="flex flex-col gap-1.5 mt-2.5">
                {[
                  "Local IndexedDB persistent library storage",
                  "Authentic vertical layout (`writing-mode: vertical-rl`)",
                  "Adjustable spacing, fonts (Mincho) and themes",
                  "Shift + Hover dictionary search (Jitendex SQLite)",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      className="text-blue-500"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:text-blue-300 mt-8 transition-colors select-none">
              Open Library
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="transform group-hover:translate-x-1 transition-transform"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </Link>

          {/* Card 2: Live Texthooker Client */}
          <Link
            href="/texthooker"
            className="group relative flex flex-col justify-between rounded-3xl border border-neutral-900 bg-neutral-950/40 p-8 hover:bg-neutral-900/40 hover:border-neutral-800 transition-all duration-500 shadow-lg cursor-pointer transform hover:-translate-y-1 hover:shadow-2xl"
          >
            {/* Hover card glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/30 border border-indigo-900/30 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-105 transition-transform">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-bold text-zinc-100 font-sans group-hover:text-white transition-colors">
                  テキストフッカー Texthooker
                </h3>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                  Connect to local Textractor WebSocket server and stream visual novel text live into the web dashboard.
                </p>
              </div>

              {/* Bullet Features */}
              <ul className="flex flex-col gap-1.5 mt-2.5">
                {[
                  "Real-time game dialogue streaming (WebSocket)",
                  "Automatic clipboard copy and text-to-speech",
                  "Integrated sentence history and editing panel",
                  "Custom typographic settings and focusing modes",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      className="text-indigo-500"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 mt-8 transition-colors select-none">
              Open Texthooker
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="transform group-hover:translate-x-1 transition-transform"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </Link>

          {/* Card 3: Video Player & Subtitles */}
          <Link
            href="/video-player"
            className="group relative flex flex-col justify-between rounded-3xl border border-neutral-900 bg-neutral-950/40 p-8 hover:bg-neutral-900/40 hover:border-neutral-800 transition-all duration-500 shadow-lg cursor-pointer transform hover:-translate-y-1 hover:shadow-2xl"
          >
            {/* Hover card glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/0 via-violet-500/0 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-950/30 border border-violet-900/30 flex items-center justify-center text-violet-400 shadow-inner group-hover:scale-105 transition-transform">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-bold text-zinc-100 font-sans group-hover:text-white transition-colors">
                  動画 Player & Subtitles
                </h3>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                  Stream local videos with interactive SRT/VTT subtitle tracks. Hold Shift to look up definitions.
                </p>
              </div>

              {/* Bullet Features */}
              <ul className="flex flex-col gap-1.5 mt-2.5">
                {[
                  "HTML5 overlay subtitles (Shift + Hover lookup)",
                  "Custom subtitle sync offsets (±0.5s intervals)",
                  "Collapsible interactive script sidebar panel",
                  "Shortcuts to replay, pause-on-hover & copy line",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      className="text-violet-500"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 group-hover:text-violet-300 mt-8 transition-colors select-none">
              Open Video Player
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="transform group-hover:translate-x-1 transition-transform"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 md:px-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-neutral-900/50 backdrop-blur-sm z-10 text-[10px] text-neutral-600 font-mono">
        <span>&copy; 2026 JapanOS Workspace. Built for language immersion.</span>
        <span>Keyboard shortcuts: ArrowLeft/Right to paginate vertical reader. Shift+Hover for dictionary.</span>
      </footer>
    </div>
  );
}
