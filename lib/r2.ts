import { S3Client } from "@aws-sdk/client-s3";

// Credentials are read only in server routes, never bundled into the reader.
let cached: { client: S3Client; bucket: string } | null = null;

export function getR2() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET before uploading PDFs.",
    );
  }
  // One client per process: it holds the connection pool, and R2 is one endpoint.
  if (!cached || cached.bucket !== bucket) {
    cached = {
      bucket,
      client: new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
        requestHandler: { requestTimeout: 300000 },
      }),
    };
  }
  return cached;
}

// Objects are never public: the key is only ever used server-side.
export function bookObjectKey(id: string) {
  return `productivity-books/${id}.pdf`;
}

/**
 * The cover derived from page 1. Deriving the key from the id rather than
 * storing it is what keeps a second field off the record: the book carries a
 * plain `hasCover` boolean, and nothing about R2's layout ever reaches a
 * client — a key it could read is a key it could ask us to fetch.
 */
export function bookCoverKey(id: string) {
  return `productivity-books/${id}-cover.jpg`;
}

// Map provider errors to useful messages without exposing credentials or signatures.
export function getR2UploadError(error: unknown): {
  message: string;
  status: number;
} {
  const details =
    error && typeof error === "object"
      ? (error as {
          name?: unknown;
          message?: unknown;
          code?: unknown;
          $metadata?: { httpStatusCode?: number };
        })
      : {};
  const name = typeof details.name === "string" ? details.name : "";
  const message =
    typeof details.message === "string" ? details.message.toLowerCase() : "";
  const httpStatus = details.$metadata?.httpStatusCode;

  if (name === "NoSuchBucket" || message.includes("nosuchbucket")) {
    return {
      message:
        "The configured R2 bucket does not exist. Check R2_BUCKET and R2_ACCOUNT_ID in the Cloudflare dashboard, then restart the app.",
      status: 503,
    };
  }
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    name === "InvalidAccessKeyId" ||
    name === "SignatureDoesNotMatch" ||
    name === "AccessDenied"
  ) {
    return {
      message:
        "Cloudflare R2 rejected the API credentials. Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY, and that the token has object read and write on this bucket, then restart the app.",
      status: 503,
    };
  }
  if (httpStatus === 413 || message.includes("too large")) {
    return {
      message:
        "This PDF exceeds R2's upload limit. The app allows 100 MB; a single-part upload to R2 is capped at 5 GB, so check your bucket's limits.",
      status: 413,
    };
  }
  if (
    name === "TimeoutError" ||
    details.code === "ETIMEDOUT" ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return {
      message:
        "The R2 upload timed out. Check your connection and try again.",
      status: 504,
    };
  }
  return {
    message:
      "Cloudflare R2 could not save this PDF. Check the service status and your bucket's permissions, then try again.",
    status: 502,
  };
}
