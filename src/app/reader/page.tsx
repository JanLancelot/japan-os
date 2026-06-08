import { Suspense } from "react";
import { Metadata } from "next";
import { ReaderDashboard } from "../../features/reader";

export const metadata: Metadata = {
  title: "JapanOS - Immersive Ebook Reader",
  description: "A premium Japanese language immersion reader with vertical/horizontal pagination, local library manager, vocabulary notebook, bookmarks, and hover dictionary lookup.",
};

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-black text-neutral-450 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-blue-500 border-neutral-900 rounded-full animate-spin" />
          <span className="text-xs font-mono">Loading Reader...</span>
        </div>
      </div>
    }>
      <ReaderDashboard />
    </Suspense>
  );
}
