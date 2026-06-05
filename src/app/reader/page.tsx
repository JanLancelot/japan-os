import { EpubReader } from "../../features/library";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "小説 Reader - Japanese OS",
  description: "Authentic right-to-left, top-to-bottom Japanese novel reader.",
};

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center bg-black text-neutral-400 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-neutral-800 animate-spin" />
          <span className="text-xs font-medium tracking-wide">Loading Reader...</span>
        </div>
      </div>
    }>
      <EpubReader />
    </Suspense>
  );
}
