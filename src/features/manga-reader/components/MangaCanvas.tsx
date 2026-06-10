"use client";

import React, { useState, useRef, useEffect } from "react";
import { OCRTextBlock } from "../types";

interface MangaCanvasProps {
  imageUrl: string;
  textBlocks: OCRTextBlock[];
  onUpdateBlocks: (blocks: OCRTextBlock[]) => void;
  ocrActive: boolean;
  showBBoxes: boolean;
  overlayOpacity: number;
  fontScale: number;
  zoomMode: "fit-height" | "fit-width" | "original";
  isDrawMode: boolean;
  setIsDrawMode: (val: boolean) => void;
  hoveredBlockId: string | null;
  setHoveredBlockId: (id: string | null) => void;
}

export const MangaCanvas: React.FC<MangaCanvasProps> = ({
  imageUrl,
  textBlocks,
  onUpdateBlocks,
  ocrActive,
  showBBoxes,
  overlayOpacity,
  fontScale,
  zoomMode,
  isDrawMode,
  setIsDrawMode,
  hoveredBlockId,
  setHoveredBlockId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

  // Inline editing state
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Dimensions of the rendered image (to calculate relative coordinates)
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, naturalWidth: 1, naturalHeight: 1 });

  const updateImageDimensions = () => {
    const img = imageRef.current;
    if (img && img.complete) {
      setImgDimensions({
        width: img.clientWidth,
        height: img.clientHeight,
        naturalWidth: img.naturalWidth || 1,
        naturalHeight: img.naturalHeight || 1,
      });
    }
  };

  useEffect(() => {
    window.addEventListener("resize", updateImageDimensions);
    return () => window.removeEventListener("resize", updateImageDimensions);
  }, []);

  // Recalculate dimensions when image URL changes or zoomMode changes
  useEffect(() => {
    updateImageDimensions();
  }, [imageUrl, zoomMode]);

  // Start Drawing Bounding Box
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawMode || !containerRef.current || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    
    // Check if click is inside the actual image
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    if (clickX >= 0 && clickX <= rect.width && clickY >= 0 && clickY <= rect.height) {
      setIsDrawing(true);
      setDrawStart({ x: clickX, y: clickY });
      setDrawCurrent({ x: clickX, y: clickY });
    }
  };

  // Move Drawing Bounding Box
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    setDrawCurrent({ x: currentX, y: currentY });
  };

  // Finish Drawing and Add Bounding Box
  const handleMouseUp = () => {
    if (!isDrawing || !imageRef.current) return;
    setIsDrawing(false);

    const x0 = Math.min(drawStart.x, drawCurrent.x);
    const y0 = Math.min(drawStart.y, drawCurrent.y);
    const x1 = Math.max(drawStart.x, drawCurrent.x);
    const y1 = Math.max(drawStart.y, drawCurrent.y);

    // Bounding box size minimum 10px
    if (x1 - x0 < 10 || y1 - y0 < 10) return;

    // Convert client coordinates to original image natural pixel coordinates
    const scaleX = imgDimensions.naturalWidth / imgDimensions.width;
    const scaleY = imgDimensions.naturalHeight / imgDimensions.height;

    const naturalX0 = Math.round(x0 * scaleX);
    const naturalY0 = Math.round(y0 * scaleY);
    const naturalX1 = Math.round(x1 * scaleX);
    const naturalY1 = Math.round(y1 * scaleY);

    const newId = `manual_${Date.now()}`;
    const newBlock: OCRTextBlock = {
      id: newId,
      text: "新規テキスト", // Default new text placeholder
      bbox: {
        x0: naturalX0,
        y0: naturalY0,
        x1: naturalX1,
        y1: naturalY1,
      },
    };

    onUpdateBlocks([...textBlocks, newBlock]);
    setIsDrawMode(false);
    
    // Automatically open edit mode for the newly drawn bubble
    setTimeout(() => {
      setEditingBlockId(newId);
      setEditingText("");
    }, 100);
  };

  // Edit Text Block
  const handleDoubleClickBlock = (e: React.MouseEvent, block: OCRTextBlock) => {
    e.stopPropagation();
    setEditingBlockId(block.id);
    setEditingText(block.text);
  };

  const handleSaveEdit = (blockId: string) => {
    if (!editingText.trim()) {
      // Remove block if text cleared
      onUpdateBlocks(textBlocks.filter((b) => b.id !== blockId));
    } else {
      // Update block text
      onUpdateBlocks(
        textBlocks.map((b) => (b.id === blockId ? { ...b, text: editingText.replace(/\s+/g, "") } : b))
      );
    }
    setEditingBlockId(null);
  };

  const handleDeleteBlock = (blockId: string) => {
    onUpdateBlocks(textBlocks.filter((b) => b.id !== blockId));
    setEditingBlockId(null);
  };

  // Zoom styles
  const getZoomStyles = () => {
    switch (zoomMode) {
      case "fit-height":
        return "max-h-[82vh] w-auto object-contain";
      case "fit-width":
        return "w-full h-auto object-contain";
      case "original":
        return "w-auto h-auto max-w-none";
      default:
        return "max-h-[82vh] w-auto object-contain";
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-zinc-950/20 border border-zinc-900/60 rounded-3xl overflow-auto h-[82vh] relative select-none">
      
      <div 
        ref={containerRef}
        className={`relative inline-block ${isDrawMode ? "cursor-crosshair" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Manga Page"
          className={`select-none pointer-events-none rounded-lg shadow-2xl transition duration-200 border border-zinc-800/20 ${getZoomStyles()}`}
          onLoad={updateImageDimensions}
        />

        {/* OCR Overlay layer */}
        {ocrActive && imgDimensions.width > 0 && textBlocks.map((block) => {
          // Convert natural coordinates to scale percentage
          const leftPct = (block.bbox.x0 / imgDimensions.naturalWidth) * 100;
          const topPct = (block.bbox.y0 / imgDimensions.naturalHeight) * 100;
          const widthPct = ((block.bbox.x1 - block.bbox.x0) / imgDimensions.naturalWidth) * 100;
          const heightPct = ((block.bbox.y1 - block.bbox.y0) / imgDimensions.naturalHeight) * 100;

          // Determine font size fitting the bounding box
          // For vertical text, column width fits the characters.
          const textLen = Math.max(1, block.text.length);
          const boxWidthPx = (widthPct / 100) * imgDimensions.width;
          const boxHeightPx = (heightPct / 100) * imgDimensions.height;
          
          // Heuristic: Font size matches width or height/textLength.
          const charSize = Math.max(9, Math.min(boxWidthPx * 0.9, boxHeightPx / textLen));
          const finalFontSize = charSize * fontScale;

          const isEditing = editingBlockId === block.id;
          const isHovered = hoveredBlockId === block.id;

          return (
            <div
              key={block.id}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
              className={`absolute flex items-center justify-center transition group rounded border text-left ${
                isHovered 
                  ? "bg-violet-500/10 border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.3)] z-40" 
                  : showBBoxes
                    ? "border-violet-500/35 bg-violet-500/[0.02] hover:border-violet-500 hover:bg-violet-500/10"
                    : "border-transparent hover:border-violet-500/30 hover:bg-violet-500/[0.04]"
              } ${isEditing ? "z-50 bg-zinc-950 border-violet-500 p-2 shadow-2xl" : ""}`}
              onMouseEnter={() => setHoveredBlockId(block.id)}
              onMouseLeave={() => setHoveredBlockId(null)}
              onDoubleClick={(e) => handleDoubleClickBlock(e, block)}
            >
              {isEditing ? (
                <div className="flex flex-col gap-1.5 w-full min-w-[120px] select-text" onClick={e => e.stopPropagation()}>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white p-1 rounded resize-none focus:outline-none focus:border-violet-500 font-sans"
                    rows={3}
                    autoFocus
                    placeholder="Enter Japanese text..."
                  />
                  <div className="flex items-center justify-between gap-1 select-none">
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingBlockId(null)}
                        className="text-[9px] font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(block.id)}
                        className="text-[9px] font-bold text-white bg-violet-600 hover:bg-violet-750 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Selectable text span */}
                  <span
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "upright",
                      fontSize: `${finalFontSize}px`,
                      lineHeight: "1.1",
                      letterSpacing: "0.05em",
                      opacity: overlayOpacity,
                    }}
                    className={`font-serif select-all select-text font-bold whitespace-nowrap pointer-events-auto h-full w-full flex items-center justify-center break-all select-none ${
                      overlayOpacity === 0 
                        ? "text-transparent cursor-text select-text" 
                        : "text-zinc-800 dark:text-zinc-150 select-text"
                    }`}
                  >
                    {block.text}
                  </span>

                  {/* Quick Edit button pencil (shows on hover) */}
                  <button
                    onClick={(e) => handleDoubleClickBlock(e, block)}
                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 bg-zinc-900/90 hover:bg-violet-900 border border-zinc-750 rounded p-0.5 w-5 h-5 flex items-center justify-center text-[8px] text-zinc-350 hover:text-white transition duration-200 cursor-pointer shadow-md select-none z-30 pointer-events-auto"
                    title="Edit Text bubble"
                  >
                    ✏️
                  </button>
                </>
              )}
            </div>
          );
        })}

        {/* Bounding Box Drawing Indicator */}
        {isDrawing && (
          <div
            style={{
              left: `${Math.min(drawStart.x, drawCurrent.x)}px`,
              top: `${Math.min(drawStart.y, drawCurrent.y)}px`,
              width: `${Math.abs(drawStart.x - drawCurrent.x)}px`,
              height: `${Math.abs(drawStart.y - drawCurrent.y)}px`,
            }}
            className="absolute border-2 border-dashed border-red-500 bg-red-500/10 pointer-events-none z-50 rounded"
          />
        )}
      </div>

    </div>
  );
};

MangaCanvas.displayName = "MangaCanvas";
