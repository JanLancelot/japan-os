"use client";

import React, { useState, useEffect, useRef } from "react";
import { MangaItem, OCRTextBlock } from "../types";
import { 
  getAllManga, 
  deleteManga, 
  getMangaPageBlob, 
  updateMangaProgress, 
  updateMangaOcrCache 
} from "../utils/db";
import { recognizePageText } from "../utils/ocr";
import { MangaLibraryView } from "./MangaLibraryView";
import { MangaCanvas } from "./MangaCanvas";
import { MangaSidebar } from "./MangaSidebar";

export const MangaReaderDashboard: React.FC = () => {
  const [mangaList, setMangaList] = useState<MangaItem[]>([]);
  const [activeManga, setActiveManga] = useState<MangaItem | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  
  // Page rendering states
  const [currentPageBlob, setCurrentPageBlob] = useState<Blob | null>(null);
  const [currentPageUrl, setCurrentPageUrl] = useState<string>("");
  const [textBlocks, setTextBlocks] = useState<OCRTextBlock[]>([]);
  
  // Settings (synced to localStorage)
  const [ocrActive, setOcrActive] = useState(true);
  const [showBBoxes, setShowBBoxes] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.0); // 0 by default for immersive view
  const [fontScale, setFontScale] = useState(1.0);
  const [readingDirection, setReadingDirection] = useState<"rtl" | "ltr">("rtl");
  const [ocrLanguage, setOcrLanguage] = useState<"jpn_vert" | "jpn" | "eng">("jpn_vert");
  const [zoomMode, setZoomMode] = useState<"fit-height" | "fit-width" | "original">("fit-height");
  
  // OCR processing states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  // Background caching state
  const backgroundScanningRef = useRef<Record<string, boolean>>({});

  // Clean up object URL when image changes to prevent memory leaks
  useEffect(() => {
    return () => {
      if (currentPageUrl) {
        URL.revokeObjectURL(currentPageUrl);
      }
    };
  }, [currentPageUrl]);

  // Load library list
  const loadMangaList = async () => {
    try {
      const list = await getAllManga();
      // Sort: newly added first
      setMangaList(list.sort((a, b) => b.addedAt - a.addedAt));
    } catch (err) {
      console.error("Failed to load manga list:", err);
    }
  };

  useEffect(() => {
    loadMangaList();
    
    // Sync settings from localStorage
    if (typeof window !== "undefined") {
      const savedOcrActive = localStorage.getItem("japanos-manga-ocrActive");
      if (savedOcrActive !== null) setOcrActive(savedOcrActive === "true");

      const savedShowBBoxes = localStorage.getItem("japanos-manga-showBBoxes");
      if (savedShowBBoxes !== null) setShowBBoxes(savedShowBBoxes === "true");

      const savedOpacity = localStorage.getItem("japanos-manga-opacity");
      if (savedOpacity !== null) setOverlayOpacity(parseFloat(savedOpacity));

      const savedScale = localStorage.getItem("japanos-manga-scale");
      if (savedScale !== null) setFontScale(parseFloat(savedScale));

      const savedDir = localStorage.getItem("japanos-manga-direction");
      if (savedDir !== null) setReadingDirection(savedDir as any);

      const savedLang = localStorage.getItem("japanos-manga-language");
      if (savedLang !== null) setOcrLanguage(savedLang as any);

      const savedZoom = localStorage.getItem("japanos-manga-zoom");
      if (savedZoom !== null) setZoomMode(savedZoom as any);
    }
  }, []);

  // Save settings helpers
  const saveSetting = (key: string, value: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`japanos-manga-${key}`, String(value));
    }
  };

  const handleToggleOcrActive = (val: boolean) => {
    setOcrActive(val);
    saveSetting("ocrActive", val);
  };

  const handleToggleShowBBoxes = (val: boolean) => {
    setShowBBoxes(val);
    saveSetting("showBBoxes", val);
  };

  const handleOpacityChange = (val: number) => {
    setOverlayOpacity(val);
    saveSetting("opacity", val);
  };

  const handleFontScaleChange = (val: number) => {
    setFontScale(val);
    saveSetting("scale", val);
  };

  const handleDirectionChange = (val: "rtl" | "ltr") => {
    setReadingDirection(val);
    saveSetting("direction", val);
  };

  const handleLanguageChange = (val: "jpn_vert" | "jpn" | "eng") => {
    setOcrLanguage(val);
    saveSetting("language", val);
  };

  const handleZoomChange = (val: "fit-height" | "fit-width" | "original") => {
    setZoomMode(val);
    saveSetting("zoom", val);
  };

  // Select a manga to read
  const handleSelectManga = async (manga: MangaItem) => {
    setActiveManga(manga);
    setCurrentPage(manga.currentPage || 0);
  };

  // Delete manga
  const handleDeleteManga = async (id: string) => {
    try {
      await deleteManga(id);
      if (activeManga?.id === id) {
        setActiveManga(null);
      }
      loadMangaList();
    } catch (err) {
      console.error("Failed to delete manga:", err);
    }
  };

  // Load the current page image Blob and OCR results
  useEffect(() => {
    if (!activeManga) return;

    const loadPage = async () => {
      setOcrLoading(false);
      setOcrProgress(0);
      setIsDrawMode(false);
      
      try {
        const blob = await getMangaPageBlob(activeManga.id, currentPage);
        if (!blob) {
          console.error("Manga page blob not found inside IndexedDB");
          return;
        }

        setCurrentPageBlob(blob);
        
        // Revoke old URL and create new one
        if (currentPageUrl) {
          URL.revokeObjectURL(currentPageUrl);
        }
        const url = URL.createObjectURL(blob);
        setCurrentPageUrl(url);

        // Load OCR from cache
        const cached = activeManga.ocrCache?.[currentPage];
        if (cached) {
          setTextBlocks(cached);
        } else {
          setTextBlocks([]);
          // Auto-scan page if not scanned yet
          triggerPageOcr(blob, currentPage);
        }

        // Trigger progress sync to database
        await updateMangaProgress(activeManga.id, currentPage);
        
        // Trigger background pre-scanning of next page
        triggerBackgroundPreScan();
      } catch (err) {
        console.error("Failed to load page contents:", err);
      }
    };

    loadPage();
  }, [activeManga, currentPage]);

  // Perform OCR on current page
  const triggerPageOcr = async (blob: Blob, pageIdx: number) => {
    if (!activeManga) return;

    setOcrLoading(true);
    setOcrProgress(0);

    try {
      const result = await recognizePageText(blob, ocrLanguage, (progress) => {
        setOcrProgress(progress);
      });

      // Update state
      setTextBlocks(result.blocks);

      // Save to IndexedDB
      await updateMangaOcrCache(activeManga.id, pageIdx, result.blocks);
      
      // Update activeManga in memory to keep cache updated
      setActiveManga(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ocrCache: {
            ...prev.ocrCache,
            [pageIdx]: result.blocks
          }
        };
      });

      // Refresh list to sync main shelf progress
      loadMangaList();
    } catch (err) {
      console.error("OCR recognition error:", err);
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
    }
  };

  const handleForceOcr = () => {
    if (currentPageBlob) {
      triggerPageOcr(currentPageBlob, currentPage);
    }
  };

  // Pre-scans the NEXT page in the background (if it is not already cached)
  const triggerBackgroundPreScan = async () => {
    if (!activeManga) return;

    const nextPageIdx = currentPage + 1;
    if (nextPageIdx >= activeManga.totalPages) return;

    // Check if next page is already cached
    const nextCached = activeManga.ocrCache?.[nextPageIdx];
    if (nextCached) return;

    const cacheKey = `${activeManga.id}_${nextPageIdx}`;
    if (backgroundScanningRef.current[cacheKey]) return; // Already scanning

    backgroundScanningRef.current[cacheKey] = true;

    try {
      const nextBlob = await getMangaPageBlob(activeManga.id, nextPageIdx);
      if (!nextBlob) return;

      // Run Tesseract background scan (non-blocking)
      const result = await recognizePageText(nextBlob, ocrLanguage);
      
      // Save cache to database
      await updateMangaOcrCache(activeManga.id, nextPageIdx, result.blocks);
      
      // Update in-memory activeManga
      setActiveManga(prev => {
        if (!prev || prev.id !== activeManga.id) return prev;
        return {
          ...prev,
          ocrCache: {
            ...prev.ocrCache,
            [nextPageIdx]: result.blocks
          }
        };
      });
    } catch (err) {
      console.error("Background pre-scan failed:", err);
    } finally {
      delete backgroundScanningRef.current[cacheKey];
    }
  };

  // Update text blocks manually (from canvas drawing or manual edits)
  const handleUpdateBlocks = async (updatedBlocks: OCRTextBlock[]) => {
    if (!activeManga) return;
    
    setTextBlocks(updatedBlocks);
    
    // Save to IndexedDB
    await updateMangaOcrCache(activeManga.id, currentPage, updatedBlocks);
    
    // Update activeManga in memory
    setActiveManga(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ocrCache: {
          ...prev.ocrCache,
          [currentPage]: updatedBlocks
        }
      };
    });
  };

  // Navigation handlers
  const handleNextPage = () => {
    if (activeManga && currentPage < activeManga.totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageChange = (page: number) => {
    if (activeManga && page >= 0 && page < activeManga.totalPages) {
      setCurrentPage(page);
    }
  };

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // Do not navigate pages if user is currently typing in an input/textarea
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        if (readingDirection === "rtl") {
          handleNextPage();
        } else {
          handlePrevPage();
        }
      } else if (e.key === "ArrowRight") {
        if (readingDirection === "rtl") {
          handlePrevPage();
        } else {
          handleNextPage();
        }
      } else if (e.key === "Space") {
        e.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeManga, currentPage, readingDirection]);

  // Main Return
  if (!activeManga) {
    return (
      <MangaLibraryView
        mangaList={mangaList}
        onSelectManga={handleSelectManga}
        onRefreshList={loadMangaList}
        onDeleteManga={handleDeleteManga}
      />
    );
  }

  return (
    <div className="flex-1 bg-[#09090b] text-[#E5E5E5] min-h-screen relative flex flex-col md:flex-row items-stretch pt-20 overflow-hidden select-none">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-violet-900/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[35%] h-[35%] rounded-full bg-violet-900/5 blur-[130px] pointer-events-none" />

      {/* Main Manga Reader Workspace Grid */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch max-w-[100vw] relative z-10">
        
        {/* Manga Canvas Pane (Left/Center) */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 relative h-[82vh]">
          {currentPageUrl ? (
            <MangaCanvas
              imageUrl={currentPageUrl}
              textBlocks={textBlocks}
              onUpdateBlocks={handleUpdateBlocks}
              ocrActive={ocrActive}
              showBBoxes={showBBoxes}
              overlayOpacity={overlayOpacity}
              fontScale={fontScale}
              zoomMode={zoomMode}
              isDrawMode={isDrawMode}
              setIsDrawMode={setIsDrawMode}
              hoveredBlockId={hoveredBlockId}
              setHoveredBlockId={setHoveredBlockId}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-t-violet-500 border-zinc-900 rounded-full animate-spin" />
              <span className="text-xs font-mono text-zinc-500">Loading Page...</span>
            </div>
          )}
        </div>

        {/* Control Sidebar Panel (Right) */}
        <MangaSidebar
          currentPage={currentPage}
          totalPages={activeManga.totalPages}
          onPageChange={handlePageChange}
          ocrActive={ocrActive}
          setOcrActive={handleToggleOcrActive}
          showBBoxes={showBBoxes}
          setShowBBoxes={handleToggleShowBBoxes}
          overlayOpacity={overlayOpacity}
          setOverlayOpacity={handleOpacityChange}
          fontScale={fontScale}
          setFontScale={handleFontScaleChange}
          readingDirection={readingDirection}
          setReadingDirection={handleDirectionChange}
          ocrLanguage={ocrLanguage}
          setOcrLanguage={handleLanguageChange}
          isDrawMode={isDrawMode}
          setIsDrawMode={setIsDrawMode}
          onForceOcr={handleForceOcr}
          ocrLoading={ocrLoading}
          ocrProgress={ocrProgress}
          textBlocks={textBlocks}
          hoveredBlockId={hoveredBlockId}
          setHoveredBlockId={setHoveredBlockId}
          onSelectMangaMenu={() => setActiveManga(null)}
          mangaName={activeManga.name}
          zoomMode={zoomMode}
          setZoomMode={handleZoomChange}
        />
      </div>

    </div>
  );
};

MangaReaderDashboard.displayName = "MangaReaderDashboard";
