export interface OCRTextBlock {
  id: string;
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface MangaItem {
  id: string;
  name: string;
  addedAt: number;
  currentPage: number;
  totalPages: number;
  cover: string; // Base64 data URL
  ocrCache: Record<number, OCRTextBlock[]>;
}

export interface MangaPage {
  id: string; // mangaId_pageIndex
  mangaId: string;
  pageIndex: number;
  blob: Blob;
}
