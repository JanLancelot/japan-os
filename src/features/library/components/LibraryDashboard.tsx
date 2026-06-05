"use client";

import React, { useState, useRef } from "react";
import { useLibrary } from "../hooks/useLibrary";
import { useEpub } from "../hooks/useEpub";
import Link from "next/link";

export function LibraryDashboard() {
  const { books, loading, error: dbError, addBook, deleteBook } = useLibrary();
  const { parseEpubFile, parsing, error: parseError, progress } = useEpub();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".epub")) {
      try {
        const parsed = await parseEpubFile(file);
        await addBook(parsed.book, parsed.chapters, parsed.images);
      } catch (err) {
        console.error("Error loading EPUB:", err);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const parsed = await parseEpubFile(file);
        await addBook(parsed.book, parsed.chapters, parsed.images);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        console.error("Error loading EPUB:", err);
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate a premium gradient based on book title characters
  const getRandomGradient = (title: string) => {
    const charCodeSum = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index1 = charCodeSum % 6;
    const index2 = (charCodeSum + 3) % 6;
    
    const gradients = [
      "from-rose-500 to-orange-500",
      "from-violet-600 to-indigo-600",
      "from-cyan-500 to-blue-500",
      "from-emerald-500 to-teal-500",
      "from-amber-500 to-rose-500",
      "from-fuchsia-600 to-pink-500",
    ];
    
    return `bg-gradient-to-br ${gradients[index1]}`;
  };

  return (
    <div
      className="flex-1 flex flex-col bg-zinc-950 text-neutral-300 min-h-screen relative font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".epub"
        className="hidden"
      />

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-md border-4 border-dashed border-blue-500 z-50 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-neutral-800 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl scale-95 transform transition-transform duration-300 animate-bounce">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-blue-400"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-lg font-semibold text-zinc-100">Drop your EPUB here</p>
            <p className="text-xs text-neutral-500">Only .epub files are supported</p>
          </div>
        </div>
      )}

      {/* Parsing progress modal */}
      {parsing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-blue-500 border-neutral-800 animate-spin" />
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold text-zinc-100">Adding Book to Library</h4>
              <p className="text-xs text-neutral-400 font-mono mt-1">{progress}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-neutral-900 px-6 py-4 md:px-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl border border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-400 hover:text-neutral-100 transition cursor-pointer"
            title="Back to Hub"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 font-serif">小説 Library</h1>
            <p className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Novel Library & Vertical Reader</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md md:justify-end">
          {/* Search bar */}
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-neutral-500"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs py-2 pl-9 pr-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 focus:bg-neutral-900 focus:border-neutral-700 outline-none text-neutral-200 transition"
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={triggerFileSelect}
            className="flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-600/15 transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Book
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 px-6 py-8 md:px-12 max-w-7xl w-full mx-auto flex flex-col">
        {dbError && (
          <div className="mb-6 p-4 rounded-xl border border-red-950/40 bg-red-950/10 text-red-400 text-xs">
            {dbError}
          </div>
        )}
        {parseError && (
          <div className="mb-6 p-4 rounded-xl border border-red-950/40 bg-red-950/10 text-red-400 text-xs">
            {parseError}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-neutral-800 animate-spin" />
            <span className="text-xs text-neutral-500">Loading library...</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center select-none border border-dashed border-neutral-900 rounded-3xl p-8 bg-zinc-900/10 hover:bg-zinc-900/20 transition-all duration-300">
            <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 shadow-inner mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-neutral-300">Your Library is Empty</h3>
            <p className="text-xs text-neutral-500 max-w-sm leading-relaxed mt-2 px-4">
              Drag & drop a Japanese `.epub` file here, or click the upload button to add your favorite books and start reading vertically!
            </p>
            <button
              onClick={triggerFileSelect}
              className="mt-5 text-xs font-semibold py-2 px-5 rounded-xl border border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300 hover:text-neutral-100 transition cursor-pointer"
            >
              Select EPUB File
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="group relative flex flex-col gap-3.5 rounded-2xl bg-zinc-900/20 hover:bg-zinc-900/50 p-2.5 transition-all duration-300 border border-transparent hover:border-neutral-900 shadow-sm"
              >
                {/* Book Cover Container */}
                <div className="relative aspect-[3/4.2] w-full rounded-xl overflow-hidden shadow-md bg-neutral-900 border border-neutral-900/80 group-hover:shadow-lg transition-shadow duration-300">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    // Generate visually stunning procedural cover using dynamic fonts and vertical title
                    <div className={`w-full h-full flex flex-col justify-between p-4 text-white relative overflow-hidden group-hover:scale-[1.03] transition-transform duration-500 ${getRandomGradient(book.title)}`}>
                      {/* Geometric background mesh */}
                      <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                      <div className="absolute -right-10 -bottom-10 w-28 h-28 rounded-full bg-white/10 blur-xl" />
                      
                      <div className="flex flex-col gap-0.5 z-10">
                        <span className="text-[9px] uppercase tracking-widest text-white/60 font-mono">Novel</span>
                        <div className="w-4 h-0.5 bg-white/40 mt-1" />
                      </div>

                      {/* Vertical Japanese Title */}
                      <div
                        className="my-auto text-base font-bold font-serif leading-tight text-white/95 break-all tracking-wider z-10 self-center flex items-center justify-center max-h-[70%] max-w-[80%]"
                        style={{
                          writingMode: "vertical-rl",
                          WebkitWritingMode: "vertical-rl",
                        }}
                      >
                        {book.title.length > 20 ? book.title.slice(0, 18) + "..." : book.title}
                      </div>

                      <div className="text-[10px] font-medium text-white/80 font-sans z-10 text-right select-none truncate">
                        {book.author}
                      </div>
                    </div>
                  )}

                  {/* Visual Progress bar inside card bottom */}
                  {book.progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${book.progressPercent}%` }}
                      />
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex flex-col items-center justify-center gap-3 z-20">
                    <Link
                      href={`/reader?bookId=${encodeURIComponent(book.id)}`}
                      className="w-[75%] text-center text-xs font-semibold py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 cursor-pointer"
                    >
                      Read Book
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove "${book.title}" from your library?`)) {
                          deleteBook(book.id);
                        }
                      }}
                      className="w-[75%] text-center text-xs font-semibold py-2 px-3 rounded-xl bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-900/30 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Book Details */}
                <div className="flex flex-col gap-1 pl-1">
                  <h3 className="text-xs font-bold text-zinc-200 line-clamp-1 group-hover:text-zinc-100 transition-colors font-serif leading-tight" title={book.title}>
                    {book.title}
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate" title={book.author}>
                    {book.author}
                  </p>
                  
                  {/* Progress string */}
                  <div className="flex items-center justify-between text-[9px] text-neutral-600 mt-0.5 select-none font-mono">
                    <span>
                      {book.currentChapterIndex > 0 
                        ? `Ch. ${book.currentChapterIndex + 1}` 
                        : "Not started"}
                    </span>
                    <span>{Math.round(book.progressPercent)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
