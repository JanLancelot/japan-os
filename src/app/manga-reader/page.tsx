import { Suspense } from "react";
import { Metadata } from "next";
import { MangaReaderDashboard } from "../../features/manga-reader";

export const metadata: Metadata = {
  title: "JapanOS - Immersive Manga Reader",
  description: "A premium Japanese language immersion manga reader with client-side OCR scanning, interactive text overlays, and hover dictionary lookup.",
};

export default function MangaReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-[#09090b] text-neutral-450 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-violet-500 border-neutral-900 rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-550">Loading Manga Reader...</span>
        </div>
      </div>
    }>
      <MangaReaderDashboard />
    </Suspense>
  );
}
