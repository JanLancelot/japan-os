import { OCRTextBlock } from "../types";

export async function recognizePageText(
  imageBlob: Blob,
  language: "jpn_vert" | "jpn" | "eng" = "jpn_vert",
  onProgress?: (progress: number) => void
): Promise<{ blocks: OCRTextBlock[]; width: number; height: number }> {
  // Dynamically import tesseract.js to avoid Next.js SSR build issues
  const Tesseract = await import("tesseract.js").then((m) => m.default || m);

  const imageUrl = URL.createObjectURL(imageBlob);

  try {
    const result = await Tesseract.recognize(imageUrl, language, {
      logger: (message) => {
        if (message.status === "recognizing" && onProgress) {
          onProgress(message.progress);
        }
      },
    });

    const { blocks } = result.data;
    
    // Create image element to get its natural dimensions
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = imageUrl;
    });

    const width = img.naturalWidth || 800;
    const height = img.naturalHeight || 1200;

    const formattedBlocks: OCRTextBlock[] = [];
    let blockIndex = 0;

    if (blocks) {
      for (const block of blocks) {
        // Tesseract's block.lines represents lines of text. 
        // This is ideal for speech bubbles, as each line can be hovered individually.
        const lines = block.lines || [block];
        for (const line of lines) {
          const text = line.text.trim();
          // Filter out empty or punctuation-only strings
          if (text && !/^[\s、。！？\.,!?()（）\-\—・]+$/.test(text)) {
            formattedBlocks.push({
              id: `block_${blockIndex++}_${Date.now()}`,
              text: text.replace(/\s+/g, ""), // Remove spaces for Japanese text
              bbox: {
                x0: line.bbox.x0,
                y0: line.bbox.y0,
                x1: line.bbox.x1,
                y1: line.bbox.y1,
              },
            });
          }
        }
      }
    }

    return {
      blocks: formattedBlocks,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
