import React, { useState, useEffect } from "react";
import { Book } from "../types";
import { saveBook, deleteBook } from "../utils/db";

interface LibraryViewProps {
  onSelectBook: (book: Book) => void;
  books: Book[];
  onRefreshBooks: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onSelectBook,
  books,
  onRefreshBooks,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [uploadError, setUploadError] = useState("");


  const handleFileUpload = async (file: File) => {
    setUploadError("");
    const isEpub = file.name.endsWith(".epub");
    const isTxt = file.name.endsWith(".txt");

    if (!isEpub && !isTxt) {
      setUploadError("Only EPUB and plain TXT files are supported.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) return;

        let title = file.name.replace(/\.(epub|txt)$/i, "");
        let author = "Unknown Author";
        let coverUrl: string | undefined;

        if (isEpub) {
          try {
            const { parseEpubMetadata } = await import("../utils/epubParser");
            const meta = await parseEpubMetadata(buffer);
            title = meta.title || title;
            author = meta.author || author;
            coverUrl = meta.coverUrl;
          } catch (err) {
            console.error("EPUB metadata parse error, using file name:", err);
          }
        }

        const newBook: Book = {
          id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          author,
          coverUrl,
          fileType: isEpub ? "epub" : "txt",
          fileData: buffer,
          addedAt: Date.now(),
          currentChapterIndex: 0,
          currentProgress: 0,
        };

        await saveBook(newBook);
        onRefreshBooks();
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Failed to upload book:", err);
      setUploadError("Failed to read the file. Please try again.");
    }
  };

  const handleDelete = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this book from your library?")) {
      await deleteBook(bookId);
      onRefreshBooks();
    }
  };

  // Drag and Drop triggers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 pt-24 md:pt-28 overflow-y-auto max-w-5xl w-full mx-auto gap-8 relative select-none">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
            <span className="text-[#E50914] font-serif">和</span> Ebook Library
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Immerse in Japanese literature. Upload custom EPUB or plain TXT files. Shift + hover words for popups.
          </p>
        </div>

        {/* Manual Browse button */}
        <label className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center gap-2 cursor-pointer backdrop-blur-md shadow-lg duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import Book File
          <input
            type="file"
            accept=".epub,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </label>
      </div>

      {uploadError && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium">
          ⚠️ {uploadError}
        </div>
      )}

      {/* Upload Drop Zone card */}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-10 bg-zinc-900/10 text-center backdrop-blur-md transition-all duration-500 flex flex-col justify-center items-center gap-4 cursor-pointer shadow-lg group/zone ${
          isDragOver
            ? "border-[#E50914] bg-red-500/5 shadow-[0_0_45px_rgba(229,9,20,0.15)]"
            : "border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/20"
        }`}
      >
        <input
          type="file"
          accept=".epub,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 ${
          isDragOver ? "bg-red-950/40 border-red-800 text-red-500 scale-110 shadow-lg shadow-red-950/50" : "bg-zinc-900 border-zinc-800 text-zinc-400 group-hover/zone:scale-105"
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <div className="flex flex-col gap-1 select-none">
          <p className="text-sm font-bold text-zinc-200">
            Drag and drop book files here, or{" "}
            <span className="text-[#E50914] group-hover/zone:underline">
              browse files
            </span>
          </p>
          <p className="text-xs text-zinc-500 font-mono">
            Supports EPUB or plain TXT format
          </p>
        </div>
      </label>

      {/* Book Grid */}
      <div className="flex flex-col gap-5 animate-in fade-in duration-500">
        <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest font-mono">Your Books ({books.length})</h3>
        
        {isSeeding && books.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500 text-sm bg-zinc-950/20 rounded-3xl border border-zinc-900/60">
            <div className="w-6 h-6 border-2 border-t-transparent border-[#E50914] rounded-full animate-spin" />
            <span className="font-mono text-xs text-zinc-400">Seeding classic Aozora Bunko library...</span>
          </div>
        ) : books.length === 0 ? (
          <div className="py-20 text-center bg-zinc-950/20 rounded-3xl border border-zinc-900/60 animate-in fade-in duration-300">
            <p className="text-sm text-zinc-500 italic">Your library is currently empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group relative flex flex-col bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-3 hover:bg-zinc-900/25 hover:border-zinc-800 transition-all duration-300 cursor-pointer shadow-lg transform hover:-translate-y-1 hover:shadow-2xl"
              >
                {/* Delete button (shows on hover) */}
                <button
                  onClick={(e) => handleDelete(e, book.id)}
                  className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg bg-zinc-950/85 hover:bg-red-650/25 hover:text-red-400 border border-zinc-850 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer shadow-md"
                  title="Delete Book"
                >
                  ❌
                </button>

                {/* Cover Image container */}
                <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-900 relative shadow-inner group-hover:scale-[1.03] transition duration-300">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    // Fallback cover
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col justify-between p-4">
                      <div className="text-[7px] font-mono text-zinc-500 tracking-widest uppercase">Ebook Reader</div>
                      <div className="text-xs font-serif font-bold text-zinc-300 line-clamp-3 leading-tight">{book.title}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{book.author}</div>
                    </div>
                  )}

                  {/* Reading Progress Netflix red bar */}
                  {book.currentProgress > 0 && (
                    <>
                      {/* Floating progress text overlay */}
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-200 font-bold border border-white/5 opacity-80 animate-in fade-in duration-300">
                        {book.currentProgress}% read
                      </div>
                      
                      {/* Thin red bar at the bottom */}
                      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-zinc-950/60 backdrop-blur-[2px]">
                        <div 
                          className="h-full bg-red-600 rounded-r shadow-[0_0_8px_rgba(229,9,20,0.7)]"
                          style={{ width: `${book.currentProgress}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Title & Author */}
                <div className="mt-3 flex flex-col min-w-0">
                  <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white transition truncate font-sans">
                    {book.title}
                  </h4>
                  <span className="text-[10px] text-zinc-500 mt-0.5 truncate">
                    {book.author}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
