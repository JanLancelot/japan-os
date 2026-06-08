import { Book, Bookmark, Highlight, VocabularyItem, ReaderSettings } from "../types";

const DB_NAME = "japanos-reader-db";
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject("IndexedDB is only available in the browser.");
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB opening error:", event);
      reject("Failed to open local database.");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Books store
      if (!db.objectStoreNames.contains("books")) {
        db.createObjectStore("books", { keyPath: "id" });
      }

      // 2. Bookmarks store
      if (!db.objectStoreNames.contains("bookmarks")) {
        const bookmarksStore = db.createObjectStore("bookmarks", { keyPath: "id" });
        bookmarksStore.createIndex("bookId", "bookId", { unique: false });
      }

      // 3. Highlights store
      if (!db.objectStoreNames.contains("highlights")) {
        const highlightsStore = db.createObjectStore("highlights", { keyPath: "id" });
        highlightsStore.createIndex("bookId", "bookId", { unique: false });
      }

      // 4. Vocabulary store
      if (!db.objectStoreNames.contains("vocabulary")) {
        const vocabStore = db.createObjectStore("vocabulary", { keyPath: "id" });
        vocabStore.createIndex("bookId", "bookId", { unique: false });
        vocabStore.createIndex("expression", "expression", { unique: false });
      }
    };
  });
}

// --- Book Store Operations ---

export async function getAllBooks(): Promise<Book[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readonly");
    const store = transaction.objectStore("books");
    const request = store.getAll();

    request.onsuccess = () => {
      // Exclude large raw binary file data when returning the list for dashboard speed
      // Wait, actually, let's keep it or fetch it on demand. To avoid loading MBs of binary data in memory for book list,
      // let's return everything but we can store it, or for simplicity we just return all. Since it's local client-side,
      // loading a few books is perfectly fine.
      resolve(request.result as Book[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getBook(id: string): Promise<Book | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readonly");
    const store = transaction.objectStore("books");
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveBook(book: Book): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readwrite");
    const store = transaction.objectStore("books");
    const request = store.put(book);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteBook(id: string): Promise<void> {
  const db = await openDB();
  
  // Also delete bookmarks, highlights, vocab items associated with the book
  await deleteAssociatedData(id);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readwrite");
    const store = transaction.objectStore("books");
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function deleteAssociatedData(bookId: string): Promise<void> {
  const db = await openDB();
  
  const deleteFromStore = (storeName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const index = store.index("bookId");
      const request = index.openCursor(IDBKeyRange.only(bookId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  };

  await Promise.all([
    deleteFromStore("bookmarks"),
    deleteFromStore("highlights")
  ]);
}

// --- Bookmarks Operations ---

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("bookmarks", "readonly");
    const store = transaction.objectStore("bookmarks");
    const index = store.index("bookId");
    const request = index.getAll(IDBKeyRange.only(bookId));

    request.onsuccess = () => {
      resolve((request.result as Bookmark[]).sort((a, b) => a.createdAt - b.createdAt));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("bookmarks", "readwrite");
    const store = transaction.objectStore("bookmarks");
    const request = store.put(bookmark);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("bookmarks", "readwrite");
    const store = transaction.objectStore("bookmarks");
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// --- Highlights Operations ---

export async function getHighlights(bookId: string): Promise<Highlight[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("highlights", "readonly");
    const store = transaction.objectStore("highlights");
    const index = store.index("bookId");
    const request = index.getAll(IDBKeyRange.only(bookId));

    request.onsuccess = () => {
      resolve(request.result as Highlight[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveHighlight(highlight: Highlight): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("highlights", "readwrite");
    const store = transaction.objectStore("highlights");
    const request = store.put(highlight);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("highlights", "readwrite");
    const store = transaction.objectStore("highlights");
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// --- Vocabulary Store Operations ---

export async function getVocabulary(): Promise<VocabularyItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("vocabulary", "readonly");
    const store = transaction.objectStore("vocabulary");
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result as VocabularyItem[]).sort((a, b) => b.createdAt - a.createdAt));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function addVocabulary(item: VocabularyItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("vocabulary", "readwrite");
    const store = transaction.objectStore("vocabulary");
    const request = store.put(item);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteVocabulary(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("vocabulary", "readwrite");
    const store = transaction.objectStore("vocabulary");
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// --- LocalStorage Reader Settings Helper ---

export function getReaderSettings(): ReaderSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  const saved = localStorage.getItem("japanos-reader-settings");
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

export function saveReaderSettings(settings: ReaderSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("japanos-reader-settings", JSON.stringify(settings));
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "sepia",
  fontSize: 18,
  lineHeight: 1.75,
  fontFamily: "serif",
  writingMode: "horizontal",
  columnsCount: "auto",
  marginSize: "normal",
  hoverLookup: true,
  shiftKeyRequired: true,
};
