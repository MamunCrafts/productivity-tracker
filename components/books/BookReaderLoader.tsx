"use client";

import dynamic from "next/dynamic";

// Keep the PDF worker and canvas code out of server rendering.
const BookReader = dynamic(() => import("./BookReader"), {
  ssr: false,
  loading: () => (
    <p className="p-8" role="status">
      Opening reader…
    </p>
  ),
});
export function BookReaderLoader({ id }: { id: string }) {
  return <BookReader id={id} />;
}
