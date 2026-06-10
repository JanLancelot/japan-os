import { MangaItem, OCRTextBlock } from "../types";

const DB_NAME = "japanos-manga-db";
const DB_VERSION = 1;

export function openMangaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject("IndexedDB is only available in the browser.");
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB opening error:", event);
      reject("Failed to open local manga database.");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Manga metadata store
      if (!db.objectStoreNames.contains("manga")) {
        db.createObjectStore("manga", { keyPath: "id" });
      }

      // 2. Manga pages binary store
      if (!db.objectStoreNames.contains("manga_pages")) {
        db.createObjectStore("manga_pages", { keyPath: "id" });
      }
    };
  });
}

// --- Manga Metadata Operations ---

export async function getAllManga(): Promise<MangaItem[]> {
  const db = await openMangaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("manga", "readonly");
    const store = transaction.objectStore("manga");
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as MangaItem[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getManga(id: string): Promise<MangaItem | null> {
  const db = await openMangaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("manga", "readonly");
    const store = transaction.objectStore("manga");
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveManga(manga: MangaItem): Promise<void> {
  const db = await openMangaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("manga", "readwrite");
    const store = transaction.objectStore("manga");
    const request = store.put(manga);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function updateMangaProgress(id: string, currentPage: number): Promise<void> {
  const manga = await getManga(id);
  if (!manga) return;
  manga.currentPage = currentPage;
  await saveManga(manga);
}

export async function updateMangaOcrCache(
  id: string,
  pageIndex: number,
  blocks: OCRTextBlock[]
): Promise<void> {
  const manga = await getManga(id);
  if (!manga) return;
  if (!manga.ocrCache) {
    manga.ocrCache = {};
  }
  manga.ocrCache[pageIndex] = blocks;
  await saveManga(manga);
}

export async function deleteManga(id: string): Promise<void> {
  const db = await openMangaDB();
  
  // First delete all pages associated with the manga
  await deleteMangaPages(id);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("manga", "readwrite");
    const store = transaction.objectStore("manga");
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// --- Manga Pages Binary Operations ---

export async function saveMangaPage(
  mangaId: string,
  pageIndex: number,
  blob: Blob
): Promise<void> {
  const db = await openMangaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("manga_pages", "readwrite");
    const store = transaction.objectStore("manga_pages");
    const request = store.put({
      id: `${mangaId}_${pageIndex}`,
      mangaId,
      pageIndex,
      blob,
    });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getMangaPageBlob(mangaId: string, pageIndex: number): Promise<Blob | null> {
  const db = await openMangaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("manga_pages", "readonly");
    const store = transaction.objectStore("manga_pages");
    const request = store.get(`${mangaId}_${pageIndex}`);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.blob : null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function deleteMangaPages(mangaId: string): Promise<void> {
  const db = await openMangaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("manga_pages", "readwrite");
    const store = transaction.objectStore("manga_pages");
    
    // We open a cursor and delete matches. Since it's a small local DB, this is very fast.
    const request = store.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        if (cursor.value.mangaId === mangaId) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
