import { v2 as cloudinary } from "cloudinary";

// Credentials are read only in server routes, never bundled into the reader.
export function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET before uploading PDFs.",
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
}

// Map provider errors to useful messages without exposing credentials or signatures.
export function getCloudinaryUploadError(error: unknown): {
  message: string;
  status: number;
} {
  const details =
    error && typeof error === "object"
      ? (error as { message?: unknown; http_code?: unknown; code?: unknown })
      : {};
  const message =
    typeof details.message === "string" ? details.message.toLowerCase() : "";

  if (
    message.includes("cloud_name mismatch") ||
    message.includes("unknown cloud name")
  ) {
    return {
      message:
        "Cloudinary cloud name does not match your API credentials. Copy CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET from the same Cloudinary product environment, then restart the app.",
      status: 503,
    };
  }
  if (
    details.http_code === 401 ||
    message.includes("invalid signature") ||
    message.includes("api_key") ||
    message.includes("api key")
  ) {
    return {
      message:
        "Cloudinary rejected the API credentials. Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET for the configured cloud name, then restart the app.",
      status: 503,
    };
  }
  if (
    details.http_code === 413 ||
    message.includes("file size") ||
    message.includes("too large")
  ) {
    return {
      message:
        "This PDF exceeds Cloudinary's upload limit. The app allows 100 MB, but your Cloudinary account must also allow this size for raw files. Check Account Settings → Usage limits.",
      status: 413,
    };
  }
  if (
    details.http_code === 499 ||
    details.code === "ETIMEDOUT" ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return {
      message:
        "Cloudinary upload timed out. Check your connection and try again.",
      status: 504,
    };
  }
  return {
    message:
      "Cloudinary could not save this PDF. Check the service status and your account's upload permissions, then try again.",
    status: 502,
  };
}
