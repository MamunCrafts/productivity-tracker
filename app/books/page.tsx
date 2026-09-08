import { PageHeader, PageShell } from "@/components/PageFrame";
import { BookLibrary } from "@/components/books/BookLibrary";

// The library shares its categories with Notes.
export default function BooksPage() {
  return (
    <PageShell width="6xl">
      <PageHeader
        title="Books"
        lead="Your PDFs, a quiet place to read, and the passages you want to keep."
      />
      <BookLibrary />
    </PageShell>
  );
}
