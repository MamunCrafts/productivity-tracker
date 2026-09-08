// XHR reports bytes sent to our server; Cloudinary saving finishes afterward.
export function uploadBook(
  form: FormData,
  onProgress: (percentage: number | null) => void,
  onUploaded: () => void,
  signal: AbortSignal,
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };

    request.open("POST", "/api/books");
    request.responseType = "json";
    // Allow time for both the browser upload and the server's Cloudinary upload.
    request.timeout = 10 * 60 * 1000;
    request.upload.onprogress = (event) => {
      onProgress(
        event.lengthComputable && event.total > 0
          ? Math.min(100, Math.floor((event.loaded / event.total) * 100))
          : null,
      );
    };
    request.upload.onload = () => {
      onProgress(100);
      onUploaded();
    };
    request.onload = () => {
      const data = request.response;
      if (request.status < 200 || request.status >= 300) {
        fail(
          typeof data?.error === "string"
            ? data.error
            : "Upload failed. Please try again.",
        );
        return;
      }
      if (!data || typeof data.id !== "string") {
        fail("Your session may have expired. Reload and sign in again.");
        return;
      }
      cleanup();
      resolve({ id: data.id });
    };
    request.onerror = () =>
      fail("Upload failed. Check your connection and try again.");
    request.ontimeout = () =>
      fail("The upload timed out. Check your library before retrying.");
    request.onabort = () => fail("Upload canceled.");

    // Stop the browser request when the user leaves the library.
    if (signal.aborted) {
      fail("Upload canceled.");
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    request.send(form);
  });
}
