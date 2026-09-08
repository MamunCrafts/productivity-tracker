// Highlight coordinates are fractions of the rendered PDF page.
export type Highlight = {
  id: string;
  page: number;
  text: string;
  rectangles: { x: number; y: number; width: number; height: number }[];
};

export type Book = {
  id: string;
  title: string;
  categoryId: string | null;
  sourceFilename: string;
  bytes: number;
  currentPage: number;
  highlights: Highlight[];
  createdAt: string;
};
