"use client";

import React, { useState, useEffect } from "react";
import { MangaItem } from "../types";
import { saveManga, saveMangaPage } from "../utils/db";

interface MangaLibraryViewProps {
  mangaList: MangaItem[];
  onSelectManga: (manga: MangaItem) => void;
  onRefreshList: () => void;
  onDeleteManga: (id: string) => Promise<void>;
}

export const MangaLibraryView: React.FC<MangaLibraryViewProps> = ({
  mangaList,
  onSelectManga,
  onRefreshList,
  onDeleteManga,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState("");
  const [uploadError, setUploadError] = useState("");

  const generateThumbnail = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        const targetHeight = 240;
        const targetWidth = (img.naturalWidth / img.naturalHeight) * targetHeight;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        
        URL.revokeObjectURL(img.src);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve("");
      };
    });
  };

  const processMangaFiles = async (name: string, files: { name: string; blob: Blob }[]) => {
    if (files.length === 0) {
      setUploadError("No image files found in the upload.");
      return;
    }

    setIsProcessing(true);
    setUploadError("");

    try {
      // 1. Sort files alphabetically to ensure pages are in order
      files.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      );

      setProcessingProgress("Generating cover thumbnail...");
      // 2. Generate cover from the first image
      const coverBase64 = await generateThumbnail(files[0].blob);

      const mangaId = `manga-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 3. Save pages to IndexedDB
      for (let i = 0; i < files.length; i++) {
        setProcessingProgress(`Saving page ${i + 1} of ${files.length}...`);
        await saveMangaPage(mangaId, i, files[i].blob);
      }

      // 4. Save metadata
      const newManga: MangaItem = {
        id: mangaId,
        name: name.replace(/\.zip$/i, ""),
        addedAt: Date.now(),
        currentPage: 0,
        totalPages: files.length,
        cover: coverBase64,
        ocrCache: {},
      };

      setProcessingProgress("Saving metadata...");
      await saveManga(newManga);

      onRefreshList();
    } catch (err) {
      console.error("Failed to process manga upload:", err);
      setUploadError("Failed to process the files. Please make sure they are valid images.");
    } finally {
      setIsProcessing(false);
      setProcessingProgress("");
    }
  };

  const handleZipUpload = async (file: File) => {
    setUploadError("");
    setIsProcessing(true);
    setProcessingProgress("Loading ZIP file...");

    try {
      const JSZip = await import("jszip").then((m) => m.default || m);
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      const filePromises: { name: string; blob: Blob }[] = [];
      
      const keys = Object.keys(content.files);
      let loaded = 0;

      for (const key of keys) {
        const entry = content.files[key];
        if (!entry.dir && /\.(png|jpe?g|webp)$/i.test(entry.name)) {
          setProcessingProgress(`Extracting page ${loaded + 1}...`);
          const blob = await entry.async("blob");
          filePromises.push({
            name: entry.name,
            blob,
          });
          loaded++;
        }
      }

      await processMangaFiles(file.name, filePromises);
    } catch (err) {
      console.error("Failed to parse zip file:", err);
      setUploadError("Failed to read the ZIP file. Please ensure it is a valid zip archive.");
      setIsProcessing(false);
    }
  };

  const handleFolderUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    setUploadError("");
    setIsProcessing(true);
    setProcessingProgress("Scanning folder files...");

    const filePromises: { name: string; blob: Blob }[] = [];
    let folderName = "Manga Folder";

    // Try to extract root folder name from webkitRelativePath
    if (fileList[0] && fileList[0].webkitRelativePath) {
      const parts = fileList[0].webkitRelativePath.split("/");
      if (parts.length > 0) {
        folderName = parts[0];
      }
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (/\.(png|jpe?g|webp)$/i.test(file.name)) {
        filePromises.push({
          name: file.webkitRelativePath || file.name,
          blob: file,
        });
      }
    }

    await processMangaFiles(folderName, filePromises);
  };

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
    
    if (isProcessing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".zip")) {
        handleZipUpload(file);
      } else {
        setUploadError("Drag and drop only supports .zip files. To upload folders, use the folder import option.");
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove "${name}" from your library?`)) {
      await onDeleteManga(id);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 pt-24 md:pt-28 overflow-y-auto max-w-5xl w-full mx-auto gap-8 relative select-none">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
            <span className="text-violet-500 font-serif">画</span> Manga Reader Library
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Upload custom manga ZIP volumes or full image folders. Hover speech bubbles to display selectable overlay text.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <label className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center gap-2 cursor-pointer backdrop-blur-md shadow-lg duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import ZIP Archive
            <input
              type="file"
              accept=".zip"
              className="hidden"
              disabled={isProcessing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleZipUpload(file);
              }}
            />
          </label>

          <label className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center gap-2 cursor-pointer backdrop-blur-md shadow-lg duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            Import Image Folder
            <input
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              disabled={isProcessing}
              onChange={(e) => {
                handleFolderUpload(e.target.files);
              }}
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium">
          ⚠️ {uploadError}
        </div>
      )}

      {/* Upload Drop Zone card */}
      {!isProcessing && (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-10 bg-zinc-900/10 text-center backdrop-blur-md transition-all duration-500 flex flex-col justify-center items-center gap-4 cursor-pointer shadow-lg group/zone ${
            isDragOver
              ? "border-violet-500 bg-violet-500/5 shadow-[0_0_45px_rgba(139,92,246,0.15)]"
              : "border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/20"
          }`}
        >
          <input
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleZipUpload(file);
            }}
          />
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 ${
            isDragOver ? "bg-violet-950/40 border-violet-800 text-violet-450 scale-110 shadow-lg shadow-violet-950/50" : "bg-zinc-900 border-zinc-800 text-zinc-400 group-hover/zone:scale-105"
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="flex flex-col gap-1 select-none">
            <p className="text-sm font-bold text-zinc-150">Drag and drop manga ZIP archives here, or <span className="text-violet-500 group-hover/zone:underline">browse files</span></p>
            <p className="text-xs text-zinc-555 font-mono">Supports .zip archives containing page images, or import whole folders above</p>
          </div>
        </label>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 bg-zinc-950/40 rounded-3xl border border-zinc-900/60 shadow-xl">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-t-violet-500 border-zinc-900 rounded-full animate-spin" />
            <span className="text-[10px] text-violet-400 font-bold">画</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-sm font-bold text-zinc-150">Processing Manga Import</span>
            <span className="text-xs font-mono text-zinc-450 animate-pulse">{processingProgress}</span>
          </div>
        </div>
      )}

      {/* Library Grid */}
      <div className="flex flex-col gap-5 animate-in fade-in duration-500">
        <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest font-mono">Manga Shelf ({mangaList.length})</h3>
        
        {mangaList.length === 0 && !isProcessing ? (
          <div className="py-20 text-center bg-zinc-950/20 rounded-3xl border border-zinc-900/60 animate-in fade-in duration-300">
            <p className="text-sm text-zinc-500 italic">Your manga library is currently empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {mangaList.map((manga) => {
              const progressPct = Math.round((manga.currentPage / Math.max(1, manga.totalPages - 1)) * 100);
              return (
                <div
                  key={manga.id}
                  onClick={() => onSelectManga(manga)}
                  className="group relative flex flex-col bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-3 hover:bg-zinc-900/25 hover:border-zinc-800 transition-all duration-300 cursor-pointer shadow-lg transform hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Delete button (shows on hover) */}
                  <button
                    onClick={(e) => handleDelete(e, manga.id, manga.name)}
                    className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg bg-zinc-950/85 hover:bg-red-950/25 hover:text-red-400 border border-zinc-850 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer shadow-md"
                    title="Delete Manga"
                  >
                    ❌
                  </button>

                  {/* Cover image container */}
                  <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-900 relative shadow-inner group-hover:scale-[1.02] transition duration-300">
                    {manga.cover ? (
                      <img
                        src={manga.cover}
                        alt={manga.name}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-850 to-zinc-950 flex flex-col justify-between p-4">
                        <div className="text-[7px] font-mono text-zinc-500 tracking-widest uppercase">Manga Reader</div>
                        <div className="text-xs font-serif font-bold text-zinc-300 line-clamp-3 leading-tight">{manga.name}</div>
                        <div className="text-[9px] text-zinc-550 truncate">Pages: {manga.totalPages}</div>
                      </div>
                    )}

                    {/* Progress overlay */}
                    {manga.currentPage > 0 && (
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-200 font-bold border border-white/5 opacity-80">
                        p.{manga.currentPage + 1}
                      </div>
                    )}
                    
                    {/* Progress slider bar */}
                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-zinc-950/60 backdrop-blur-[2px]">
                      <div 
                        className="h-full bg-violet-600 rounded-r shadow-[0_0_8px_rgba(139,92,246,0.7)]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Title metadata */}
                  <div className="mt-3 flex flex-col min-w-0">
                    <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white transition truncate font-sans">
                      {manga.name}
                    </h4>
                    <span className="text-[10px] text-zinc-555 mt-0.5 font-mono">
                      {manga.totalPages} pages
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

// Add display names as standard React best practice
MangaLibraryView.displayName = "MangaLibraryView";
// Extra prop definitions (in case TS loader complains about webkitdirectory property)
declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}
