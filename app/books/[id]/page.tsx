import { BookReaderLoader } from "@/components/books/BookReaderLoader";

// PDF.js uses browser APIs and is loaded only on the client.
export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <BookReaderLoader id={(await params).id} />;
}
