import { useState, useEffect, useCallback } from "react";
import * as db from "../database/libraryDb";

export function useLibrary() {
  const [books, setBooks] = useState<db.Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await db.getBooks();
      setBooks(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load library books.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch books on load
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const addBookToLibrary = async (
    book: db.Book,
    chapters: Omit<db.Chapter, "id">[],
    images: Omit<db.BookImage, "id">[]
  ) => {
    try {
      await db.saveBook(book, chapters, images);
      await fetchBooks();
    } catch (err: any) {
      console.error(err);
      throw new Error(err?.message || "Failed to save book to IndexedDB.");
    }
  };

  const deleteBookFromLibrary = async (bookId: string) => {
    try {
      await db.deleteBook(bookId);
      await fetchBooks();
    } catch (err: any) {
      console.error(err);
      throw new Error(err?.message || "Failed to delete book from library.");
    }
  };

  const updateProgress = async (
    bookId: string,
    chapterIndex: number,
    scrollPosition: number,
    progressPercent: number
  ) => {
    try {
      await db.updateBookProgress(bookId, chapterIndex, scrollPosition, progressPercent);
      // Update local state without full reload
      setBooks((prev) =>
        prev.map((b) =>
          b.id === bookId
            ? {
                ...b,
                currentChapterIndex: chapterIndex,
                scrollPosition,
                progressPercent,
              }
            : b
        )
      );
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  return {
    books,
    loading,
    error,
    addBook: addBookToLibrary,
    deleteBook: deleteBookFromLibrary,
    updateProgress,
    refresh: fetchBooks,
  };
}
