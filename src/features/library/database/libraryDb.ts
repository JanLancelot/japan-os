export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string; // Base64 cover data URL or generic visual
  addedAt: number;
  currentChapterIndex: number;
  scrollPosition: number;
  progressPercent: number;
  fontSize?: number;
  lineSpacing?: number;
  letterSpacing?: number;
  theme?: string;
  fontFamily?: string;
  sentencesPerPage?: number;
}

export interface Chapter {
  id: string; // bookId + "_" + index
  bookId: string;
  index: number;
  title: string;
  content: string; // XHTML text content
  filePath: string; // relative zip path
}

export interface BookImage {
  id: string; // bookId + "_" + filePath
  bookId: string;
  filePath: string;
  blob: Blob;
}

const DB_NAME = "JapanOSLibrary";
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error("Failed to open database"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains("books")) {
        db.createObjectStore("books", { keyPath: "id" });
      }
      
      if (!db.objectStoreNames.contains("chapters")) {
        const chapterStore = db.createObjectStore("chapters", { keyPath: "id" });
        chapterStore.createIndex("bookId", "bookId", { unique: false });
      }
      
      if (!db.objectStoreNames.contains("images")) {
        const imageStore = db.createObjectStore("images", { keyPath: "id" });
        imageStore.createIndex("bookId", "bookId", { unique: false });
      }
    };
  });
}

export async function saveBook(
  book: Book, 
  chapters: Omit<Chapter, "id">[], 
  images: Omit<BookImage, "id">[]
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["books", "chapters", "images"], "readwrite");
    
    transaction.onerror = () => {
      reject(transaction.error || new Error("Transaction failed"));
    };
    
    transaction.oncomplete = () => {
      resolve();
    };

    const bookStore = transaction.objectStore("books");
    bookStore.put(book);

    const chapterStore = transaction.objectStore("chapters");
    chapters.forEach((chap, idx) => {
      chapterStore.put({
        ...chap,
        id: `${book.id}_${idx}`
      });
    });

    const imageStore = transaction.objectStore("images");
    images.forEach((img) => {
      imageStore.put({
        ...img,
        id: `${book.id}_${img.filePath}`
      });
    });
  });
}

export async function getBooks(): Promise<Book[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readonly");
    const store = transaction.objectStore("books");
    const request = store.getAll();

    request.onsuccess = () => {
      const books = request.result || [];
      // Sort by newest added first
      books.sort((a, b) => b.addedAt - a.addedAt);
      resolve(books);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to get books"));
    };
  });
}

export async function getBook(id: string): Promise<Book | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readonly");
    const store = transaction.objectStore("books");
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to get book"));
    };
  });
}

export async function getBookChapters(bookId: string): Promise<Chapter[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("chapters", "readonly");
    const store = transaction.objectStore("chapters");
    const index = store.index("bookId");
    const request = index.getAll(bookId);

    request.onsuccess = () => {
      const chaps = request.result || [];
      // Sort by chapter index
      chaps.sort((a, b) => a.index - b.index);
      resolve(chaps);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to get chapters"));
    };
  });
}

export async function getBookImages(bookId: string): Promise<BookImage[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("images", "readonly");
    const store = transaction.objectStore("images");
    const index = store.index("bookId");
    const request = index.getAll(bookId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to get images"));
    };
  });
}

export async function updateBookProgress(
  bookId: string, 
  chapterIndex: number, 
  scrollPosition: number, 
  progressPercent: number
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readwrite");
    const store = transaction.objectStore("books");
    
    // Get existing book record
    const getRequest = store.get(bookId);
    
    getRequest.onsuccess = () => {
      const book = getRequest.result as Book | undefined;
      if (!book) {
        reject(new Error(`Book not found: ${bookId}`));
        return;
      }
      
      const updatedBook: Book = {
        ...book,
        currentChapterIndex: chapterIndex,
        scrollPosition: scrollPosition,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
      };
      
      const putRequest = store.put(updatedBook);
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error || new Error("Failed to update progress"));
    };
    
    getRequest.onerror = () => reject(getRequest.error || new Error("Failed to fetch book for progress update"));
  });
}

export async function updateBookSettings(
  bookId: string,
  settings: {
    fontSize?: number;
    lineSpacing?: number;
    letterSpacing?: number;
    theme?: string;
    fontFamily?: string;
    sentencesPerPage?: number;
  }
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("books", "readwrite");
    const store = transaction.objectStore("books");
    const getRequest = store.get(bookId);
    
    getRequest.onsuccess = () => {
      const book = getRequest.result as Book | undefined;
      if (!book) {
        reject(new Error(`Book not found: ${bookId}`));
        return;
      }
      
      const updatedBook = {
        ...book,
        ...settings,
      };
      
      const putRequest = store.put(updatedBook);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["books", "chapters", "images"], "readwrite");
    
    transaction.onerror = () => {
      reject(transaction.error || new Error("Delete transaction failed"));
    };
    
    transaction.oncomplete = () => {
      resolve();
    };

    // 1. Delete book metadata
    const bookStore = transaction.objectStore("books");
    bookStore.delete(bookId);

    // 2. Delete all chapters for this book
    const chapterStore = transaction.objectStore("chapters");
    const chapterIndex = chapterStore.index("bookId");
    const getChapsReq = chapterIndex.openCursor(IDBKeyRange.only(bookId));
    getChapsReq.onsuccess = (event) => {
      const cursor = (event.target as any).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // 3. Delete all images for this book
    const imageStore = transaction.objectStore("images");
    const imageIndex = imageStore.index("bookId");
    const getImgsReq = imageIndex.openCursor(IDBKeyRange.only(bookId));
    getImgsReq.onsuccess = (event) => {
      const cursor = (event.target as any).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
}
