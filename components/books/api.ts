// Give all library actions a readable error, including expired sessions.
export async function bookRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("Your session may have expired. Reload and sign in again.");
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The request failed. Please try again.");
  return data as T;
}
