import { useState } from "react";
import JSZip from "jszip";
import { Book, Chapter, BookImage } from "../database/libraryDb";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useEpub() {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const parseEpubFile = async (
    file: File
  ): Promise<{ book: Book; chapters: Omit<Chapter, "id">[]; images: Omit<BookImage, "id">[] }> => {
    setParsing(true);
    setError(null);
    setProgress("Loading file...");

    try {
      const buffer = await file.arrayBuffer();
      setProgress("Unzipping archive...");
      const zip = await JSZip.loadAsync(buffer);

      // 1. Locate container.xml
      setProgress("Parsing container.xml...");
      const containerFile = zip.file("META-INF/container.xml");
      if (!containerFile) {
        throw new Error("Invalid EPUB format: Missing META-INF/container.xml");
      }

      const containerXmlText = await containerFile.async("text");
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXmlText, "text/xml");
      const rootfileNode = containerDoc.querySelector("rootfile");
      if (!rootfileNode) {
        throw new Error("Invalid EPUB format: Missing rootfile in container.xml");
      }

      const opfPath = rootfileNode.getAttribute("full-path");
      if (!opfPath) {
        throw new Error("Invalid EPUB format: rootfile missing full-path attribute");
      }

      // Resolve base directory of OPF (important for relative paths inside EPUB)
      const pathParts = opfPath.split("/");
      pathParts.pop(); // Remove content.opf filename
      const baseDir = pathParts.length > 0 ? pathParts.join("/") + "/" : "";

      // 2. Read OPF file
      setProgress("Reading OPF manifest...");
      const opfFile = zip.file(opfPath);
      if (!opfFile) {
        throw new Error(`OPF package file not found at: ${opfPath}`);
      }

      const opfXmlText = await opfFile.async("text");
      const opfDoc = parser.parseFromString(opfXmlText, "text/xml");

      // 3. Extract Metadata
      setProgress("Extracting book metadata...");
      const titleNode = opfDoc.getElementsByTagName("dc:title")[0] || opfDoc.getElementsByTagName("title")[0];
      const title = titleNode ? titleNode.textContent?.trim() || "Unknown Title" : "Unknown Title";

      const creatorNode = opfDoc.getElementsByTagName("dc:creator")[0] || opfDoc.getElementsByTagName("creator")[0];
      const author = creatorNode ? creatorNode.textContent?.trim() || "Unknown Author" : "Unknown Author";

      const idNode = opfDoc.getElementsByTagName("dc:identifier")[0];
      const bookId = idNode 
        ? idNode.textContent?.trim().replace(/[^a-zA-Z0-9-]/g, "") || `book_${Date.now()}`
        : `book_${Date.now()}`;

      // 4. Parse Manifest
      setProgress("Scanning manifest items...");
      const manifestItems = opfDoc.getElementsByTagName("item");
      const manifestMap = new Map<string, { href: string; mediaType: string; properties?: string }>();
      
      for (let i = 0; i < manifestItems.length; i++) {
        const item = manifestItems[i];
        const id = item.getAttribute("id");
        const href = item.getAttribute("href");
        const mediaType = item.getAttribute("media-type");
        const properties = item.getAttribute("properties");

        if (id && href && mediaType) {
          // Resolve relative path to zip root path and decode URI encoding (like %20 to space)
          const resolvedHref = decodeURIComponent(baseDir + href);
          manifestMap.set(id, {
            href: resolvedHref,
            mediaType,
            properties: properties || undefined,
          });
        }
      }

      // 5. Parse Spine (gives reading order)
      setProgress("Determining reading spine...");
      const spineItems = opfDoc.getElementsByTagName("itemref");
      const spineIds: string[] = [];
      for (let i = 0; i < spineItems.length; i++) {
        const idref = spineItems[i].getAttribute("idref");
        if (idref) {
          spineIds.push(idref);
        }
      }

      if (spineIds.length === 0) {
        throw new Error("EPUB file contains no spine reading elements");
      }

      // 6. Find and load cover image
      setProgress("Locating cover image...");
      let coverPath = "";
      
      // EPUB 3 cover style
      for (const [id, item] of manifestMap.entries()) {
        if (item.properties === "cover-image" || item.properties?.includes("cover-image")) {
          coverPath = item.href;
          break;
        }
      }

      // EPUB 2 cover style
      if (!coverPath) {
        const metaTags = opfDoc.getElementsByTagName("meta");
        let coverId = "";
        for (let i = 0; i < metaTags.length; i++) {
          if (metaTags[i].getAttribute("name") === "cover") {
            coverId = metaTags[i].getAttribute("content") || "";
            break;
          }
        }
        if (coverId) {
          const item = manifestMap.get(coverId);
          if (item) coverPath = item.href;
        }
      }

      // Cover path fallback (search for "cover" in IDs or hrefs)
      if (!coverPath) {
        for (const [id, item] of manifestMap.entries()) {
          if (
            item.mediaType.startsWith("image/") &&
            (id.toLowerCase().includes("cover") || item.href.toLowerCase().includes("cover"))
          ) {
            coverPath = item.href;
            break;
          }
        }
      }

      let coverUrl = "";
      if (coverPath) {
        const coverFile = zip.file(coverPath);
        if (coverFile) {
          const blob = await coverFile.async("blob");
          coverUrl = await blobToBase64(blob);
        }
      }

      // 7. Extract Images
      setProgress("Extracting media files...");
      const images: Omit<BookImage, "id">[] = [];
      for (const [id, item] of manifestMap.entries()) {
        if (item.mediaType.startsWith("image/")) {
          const imgFile = zip.file(item.href);
          if (imgFile) {
            const blob = await imgFile.async("blob");
            images.push({
              bookId,
              filePath: item.href,
              blob,
            });
          }
        }
      }

      // 8. Extract Chapters (Text items in Spine)
      setProgress("Parsing text chapters...");
      const chapters: Omit<Chapter, "id">[] = [];
      for (let idx = 0; idx < spineIds.length; idx++) {
        const idref = spineIds[idx];
        const item = manifestMap.get(idref);
        
        if (item) {
          const fileObj = zip.file(item.href);
          if (fileObj) {
            const content = await fileObj.async("text");
            let chapTitle = "";

            // Parse chapter XML to extract page title or H1/H2
            try {
              const doc = parser.parseFromString(content, "text/html");
              const titleTag = doc.querySelector("title");
              if (titleTag && titleTag.textContent?.trim()) {
                chapTitle = titleTag.textContent.trim();
              } else {
                const headerTag = doc.querySelector("h1, h2, h3, h4");
                if (headerTag && headerTag.textContent?.trim()) {
                  chapTitle = headerTag.textContent.trim();
                }
              }
            } catch (e) {
              console.warn(`Could not parse chapter title for index ${idx}`, e);
            }

            if (!chapTitle) {
              chapTitle = `Chapter ${idx + 1}`;
            }

            chapters.push({
              bookId,
              index: idx,
              title: chapTitle,
              content,
              filePath: item.href,
            });
          }
        }
      }

      setProgress("Completed parsing successfully!");
      
      const book: Book = {
        id: bookId,
        title,
        author,
        coverUrl,
        addedAt: Date.now(),
        currentChapterIndex: 0,
        scrollPosition: 0,
        progressPercent: 0,
      };

      return { book, chapters, images };
    } catch (err: any) {
      console.error("EPUB parsing error:", err);
      const errMsg = err?.message || "Failed to read EPUB file structure";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setParsing(false);
    }
  };

  return {
    parseEpubFile,
    parsing,
    error,
    progress,
  };
}
