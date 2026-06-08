import JSZip from "jszip";
import { Chapter } from "../types";

// Helper to normalize path, resolving relative components like "../"
export function normalizePath(pathStr: string): string {
  const decoded = decodeURIComponent(pathStr);
  const parts = decoded.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join("/");
}

// Convert a Blob to base64 Data URL
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface ParsedBookMetadata {
  title: string;
  author: string;
  coverUrl?: string;
  chapters: Omit<Chapter, "content">[]; // Minimal spine info for metadata
}

/**
 * Extracts basic metadata and chapters metadata from EPUB to store in IndexedDB
 */
export async function parseEpubMetadata(arrayBuffer: ArrayBuffer): Promise<ParsedBookMetadata> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // 1. Parse container.xml to locate OPF file
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) {
    throw new Error("Invalid EPUB: META-INF/container.xml not found");
  }
  
  const containerXml = await containerFile.async("text");
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "text/xml");
  const rootfile = containerDoc.querySelector("rootfile");
  const opfPath = rootfile?.getAttribute("full-path");
  
  if (!opfPath) {
    throw new Error("Invalid EPUB: rootfile full-path not found");
  }
  
  // 2. Parse OPF file
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
  }
  
  const opfXml = await opfFile.async("text");
  const opfDoc = parser.parseFromString(opfXml, "text/xml");
  
  // Meta metadata
  const title = opfDoc.querySelector("title")?.textContent || "Unknown Title";
  const author = opfDoc.querySelector("creator")?.textContent || "Unknown Author";
  
  // OPF Directory for relative resolution
  const opfDirectory = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
  
  // Manifest items
  const manifestItems: { [id: string]: { href: string; mediaType: string; properties?: string } } = {};
  const manifestNodes = opfDoc.querySelectorAll("manifest > item");
  manifestNodes.forEach((node) => {
    const id = node.getAttribute("id");
    const href = node.getAttribute("href");
    const mediaType = node.getAttribute("media-type");
    const properties = node.getAttribute("properties");
    if (id && href) {
      manifestItems[id] = {
        href,
        mediaType: mediaType || "",
        properties: properties || "",
      };
    }
  });
  
  // Spine ordering
  const spineNodes = opfDoc.querySelectorAll("spine > itemref");
  const spineIds: string[] = [];
  spineNodes.forEach((node) => {
    const idref = node.getAttribute("idref");
    if (idref) spineIds.push(idref);
  });
  
  // 3. Extract Cover Image (Base64 Data URL)
  let coverId = "";
  // Search meta tag first
  const coverMeta = opfDoc.querySelector("meta[name='cover']");
  if (coverMeta) {
    coverId = coverMeta.getAttribute("content") || "";
  }
  // Try manifest properties
  if (!coverId) {
    const coverManifestNode = Array.from(manifestNodes).find(
      (node) => node.getAttribute("properties") === "cover-image"
    );
    if (coverManifestNode) {
      coverId = coverManifestNode.getAttribute("id") || "";
    }
  }
  
  let coverUrl: string | undefined;
  if (coverId && manifestItems[coverId]) {
    const coverPath = normalizePath(opfDirectory + manifestItems[coverId].href);
    const coverFile = zip.file(coverPath);
    if (coverFile) {
      try {
        const coverBlob = await coverFile.async("blob");
        coverUrl = await blobToBase64(coverBlob);
      } catch (err) {
        console.error("Error reading cover image:", err);
      }
    }
  }
  
  // 4. Construct Table of Contents metadata (Titles and Hrefs)
  // Let's first try to find the NCX file or Nav Document
  let tocItems: { title: string; href: string }[] = [];
  const navItem = Array.from(manifestNodes).find(
    (node) => node.getAttribute("properties")?.includes("nav")
  );
  
  if (navItem) {
    const navPath = normalizePath(opfDirectory + navItem.getAttribute("href"));
    const navFile = zip.file(navPath);
    if (navFile) {
      try {
        const navHtml = await navFile.async("text");
        const navDoc = parser.parseFromString(navHtml, "text/html");
        const navLinks = navDoc.querySelectorAll("nav a");
        navLinks.forEach((link) => {
          const href = link.getAttribute("href");
          const title = link.textContent?.trim();
          if (href && title) {
            tocItems.push({ title, href });
          }
        });
      } catch (err) {
        console.error("Error parsing EPUB 3 Navigation Document:", err);
      }
    }
  }
  
  // Fallback to NCX if empty
  if (tocItems.length === 0) {
    const ncxItem = Array.from(manifestNodes).find(
      (node) => node.getAttribute("media-type") === "application/x-dtbncx+xml"
    );
    if (ncxItem) {
      const ncxPath = normalizePath(opfDirectory + ncxItem.getAttribute("href"));
      const ncxFile = zip.file(ncxPath);
      if (ncxFile) {
        try {
          const ncxXml = await ncxFile.async("text");
          const ncxDoc = parser.parseFromString(ncxXml, "text/xml");
          const navPoints = ncxDoc.querySelectorAll("navPoint");
          navPoints.forEach((point) => {
            const label = point.querySelector("navLabel > text")?.textContent?.trim();
            const src = point.querySelector("content")?.getAttribute("src");
            if (label && src) {
              tocItems.push({ title: label, href: src });
            }
          });
        } catch (err) {
          console.error("Error parsing EPUB 2 NCX file:", err);
        }
      }
    }
  }
  
  // Build minimal chapter spine references
  const chapters: Omit<Chapter, "content">[] = [];
  spineIds.forEach((idref, index) => {
    const manifestItem = manifestItems[idref];
    if (manifestItem) {
      // Find title from TOC if available
      const relativeHref = manifestItem.href;
      const matchingToc = tocItems.find((t) => t.href.includes(relativeHref));
      const title = matchingToc?.title || `Chapter ${index + 1}`;
      
      chapters.push({
        id: idref,
        title,
        href: relativeHref,
        chapterIndex: index,
      });
    }
  });
  
  return {
    title,
    author,
    coverUrl,
    chapters,
  };
}

/**
 * Extracts and processes a single chapter HTML from the EPUB archive.
 * Rewrites image sources and CSS stylesheet links dynamically to browser Object URLs.
 * Returns clean content and a list of Object URLs created (to be revoked later).
 */
export async function getChapterContent(
  arrayBuffer: ArrayBuffer,
  opfPath: string,
  chapterHref: string
): Promise<{ processedHtml: string; objectUrls: string[] }> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const parser = new DOMParser();
  const objectUrls: string[] = [];
  
  // Find directory of OPF
  const opfDirectory = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
  const fullChapterPath = normalizePath(opfDirectory + chapterHref);
  
  const chapterFile = zip.file(fullChapterPath);
  if (!chapterFile) {
    throw new Error(`Chapter file not found in zip: ${fullChapterPath}`);
  }
  
  const rawHtml = await chapterFile.async("text");
  const doc = parser.parseFromString(rawHtml, "text/html");
  
  // Resolve directory path of the chapter file for resolving inner images relative to the chapter file
  const chapterDirectory = fullChapterPath.includes("/")
    ? fullChapterPath.substring(0, fullChapterPath.lastIndexOf("/") + 1)
    : "";
    
  // 1. Process and inline images
  const images = doc.querySelectorAll("img, image");
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    // Check both standard 'src' and SVG 'xlink:href' / 'href'
    let src = img.getAttribute("src") || img.getAttribute("href") || img.getAttribute("xlink:href") || "";
    if (src && !src.startsWith("data:") && !src.startsWith("http")) {
      const fullImgPath = normalizePath(chapterDirectory + src);
      const imgFile = zip.file(fullImgPath);
      if (imgFile) {
        try {
          const imgBlob = await imgFile.async("blob");
          const objUrl = URL.createObjectURL(imgBlob);
          objectUrls.push(objUrl);
          if (img.tagName.toLowerCase() === "img") {
            img.setAttribute("src", objUrl);
          } else {
            img.setAttribute("href", objUrl);
            img.setAttribute("xlink:href", objUrl);
          }
        } catch (err) {
          console.error("Failed to inline image:", fullImgPath, err);
        }
      }
    }
  }

  // 2. Remove any external stylesheet links to prevent styling conflicts
  const stylesheets = doc.querySelectorAll("link[rel='stylesheet']");
  stylesheets.forEach((sheet) => sheet.remove());
  
  // 3. Remove inline `<style>` tags if they contain body height/margin overrides that mess up pagination columns
  const styles = doc.querySelectorAll("style");
  styles.forEach((styleTag) => {
    let cssText = styleTag.textContent || "";
    // Clean up rules that lock body sizes or overflow
    cssText = cssText.replace(/body\s*\{[^}]*width[^}]*\}/gi, "");
    cssText = cssText.replace(/body\s*\{[^}]*height[^}]*\}/gi, "");
    cssText = cssText.replace(/body\s*\{[^}]*overflow[^}]*\}/gi, "");
    styleTag.textContent = cssText;
  });

  // Extract body contents
  const bodyContent = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
  
  return {
    processedHtml: bodyContent,
    objectUrls,
  };
}

/**
 * Parses a plain TXT file, splitting it into chapters based on headers,
 * and formats paragraphs as HTML.
 */
export async function parseTxtBook(
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<{ title: string; author: string; chapters: Chapter[] }> {
  // Decode TXT using Shift-JIS or UTF-8 based on typical Japanese encoding
  const decoder = new TextDecoder("utf-8");
  let text = decoder.decode(arrayBuffer);
  
  // Simple check for Shift-JIS (mojibake search or fallback if invalid UTF-8)
  if (text.includes("")) {
    try {
      const sjisDecoder = new TextDecoder("shift-jis");
      text = sjisDecoder.decode(arrayBuffer);
    } catch {
      // Fallback to UTF-8 if SJIS decoding fails
    }
  }

  // Deduce title and author
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines[0] || fileName.replace(/\.txt$/i, "");
  const author = lines[1] && lines[1].length < 20 ? lines[1] : "Unknown Author";

  // Regexes for chapter headings in Japanese and English
  const chapterRegex = /^(第[一二三四五六七八九十百千万\d]+章|第[一二三四五六七八九十百千万\d]+節|Chapter\s+\d+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ\d]+\.?\s*[\u4e00-\u9faf])/i;

  const chapters: Chapter[] = [];
  let currentChapterTitle = "Introduction";
  let currentChapterParas: string[] = [];
  let chapterIndex = 0;

  const saveCurrentChapter = () => {
    if (currentChapterParas.length > 0) {
      const content = currentChapterParas
        .map(para => `<p style="margin-bottom: 1.25em; text-indent: 1em; text-align: justify; text-justify: inter-ideograph;">${para}</p>`)
        .join("");

      chapters.push({
        id: `txt-chapter-${chapterIndex}`,
        title: currentChapterTitle,
        href: `txt-chapter-${chapterIndex}`,
        content,
        chapterIndex,
      });
      chapterIndex++;
    }
  };

  const paragraphs = text.split(/\n\s*\n/);
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Check if paragraph is a chapter header
    if (chapterRegex.test(trimmed) && trimmed.length < 60) {
      saveCurrentChapter();
      currentChapterTitle = trimmed;
      currentChapterParas = [];
    } else {
      // Clean up internal single linebreaks inside paragraphs
      const cleanPara = trimmed.replace(/\r?\n/g, "");
      currentChapterParas.push(cleanPara);
    }
  }
  
  // Save remaining paragraphs
  saveCurrentChapter();

  // If no chapters were identified, make a single default chapter
  if (chapters.length === 0 && text.trim()) {
    const paragraphsList = text.split("\n").map(l => l.trim()).filter(Boolean);
    const content = paragraphsList
      .map(p => `<p style="margin-bottom: 1.25em; text-indent: 1em; text-align: justify;">${p}</p>`)
      .join("");
    
    chapters.push({
      id: "txt-chapter-0",
      title: "Full Text",
      href: "txt-chapter-0",
      content,
      chapterIndex: 0,
    });
  }

  return {
    title,
    author,
    chapters,
  };
}
