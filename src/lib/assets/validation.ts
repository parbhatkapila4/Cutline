
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const REF_VIDEO_MAX_BYTES = 20 * 1024 * 1024;
const MAX_LOGO = 1;
const MAX_PRODUCT_PHOTOS = 5;
const MAX_REFERENCE_VIDEO = 1;
const MAX_REFERENCE_IMAGES = 3;

export const ALLOWED_TYPES_MESSAGE = "Allowed: PNG, JPG, SVG, MP4, MOV.";

const LOGO_MIMES = new Set(["image/png", "image/svg+xml", "image/jpeg"]);
const IMAGE_MIMES = new Set(["image/png", "image/jpeg"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime"]);

function getDisplayType(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "PNG",
    "image/jpeg": "JPG",
    "image/svg+xml": "SVG",
    "video/mp4": "MP4",
    "video/quicktime": "MOV",
  };
  return map[mime] ?? mime;
}

function getMaxSizeMessage(maxBytes: number): string {
  if (maxBytes >= 1024 * 1024) return `${maxBytes / (1024 * 1024)}MB`;
  return `${maxBytes / 1024}KB`;
}

export function validateLogo(file: File): string | null {
  if (!LOGO_MIMES.has(file.type)) {
    return `Invalid file type: ${getDisplayType(file.type)}. ${ALLOWED_TYPES_MESSAGE}`;
  }
  if (file.size > LOGO_MAX_BYTES) {
    return `File too large: ${file.name}. Max size: ${getMaxSizeMessage(LOGO_MAX_BYTES)}.`;
  }
  return null;
}

export function validateProductPhoto(file: File): string | null {
  if (!IMAGE_MIMES.has(file.type)) {
    return `Invalid file type: ${getDisplayType(file.type)}. ${ALLOWED_TYPES_MESSAGE}`;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return `File too large: ${file.name}. Max size: ${getMaxSizeMessage(IMAGE_MAX_BYTES)}.`;
  }
  return null;
}

export function validateReferenceVideo(file: File): string | null {
  if (!VIDEO_MIMES.has(file.type)) {
    return `Invalid file type: ${getDisplayType(file.type)}. ${ALLOWED_TYPES_MESSAGE}`;
  }
  if (file.size > REF_VIDEO_MAX_BYTES) {
    return `File too large: ${file.name}. Max size: ${getMaxSizeMessage(REF_VIDEO_MAX_BYTES)}.`;
  }
  return null;
}

export function validateReferenceImage(file: File): string | null {
  if (!IMAGE_MIMES.has(file.type)) {
    return `Invalid file type: ${getDisplayType(file.type)}. ${ALLOWED_TYPES_MESSAGE}`;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return `File too large: ${file.name}. Max size: ${getMaxSizeMessage(IMAGE_MAX_BYTES)}.`;
  }
  return null;
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);

function bufferStartsWith(buf: Buffer, sig: Buffer): boolean {
  return buf.length >= sig.length && buf.subarray(0, sig.length).equals(sig);
}

function isPng(buf: Buffer): boolean {
  return bufferStartsWith(buf, PNG_SIG);
}

function isJpeg(buf: Buffer): boolean {
  return bufferStartsWith(buf, JPEG_SIG);
}

function isSvg(buf: Buffer): boolean {
  const start = buf.subarray(0, Math.min(200, buf.length)).toString("utf8");
  const trimmed = start.replace(/\s+/g, " ").trim();
  return (
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<svg") ||
    trimmed.startsWith("<!DOCTYPE svg")
  );
}

function isMp4OrMov(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const ftyp = buf.subarray(4, 8).toString("ascii");
  if (ftyp !== "ftyp") return false;
  return true;
}

export function validateBufferCorrupt(
  buffer: Buffer,
  mimeType: string,
  filename: string
): string | null {
  const err = `Invalid or corrupt file: ${filename}.`;
  try {
    if (mimeType === "image/png") {
      return isPng(buffer) ? null : err;
    }
    if (mimeType === "image/jpeg") {
      return isJpeg(buffer) ? null : err;
    }
    if (mimeType === "image/svg+xml") {
      return isSvg(buffer) ? null : err;
    }
    if (mimeType === "video/mp4" || mimeType === "video/quicktime") {
      return isMp4OrMov(buffer) ? null : err;
    }
    return null;
  } catch {
    return err;
  }
}

export const limits = {
  maxLogo: MAX_LOGO,
  maxProductPhotos: MAX_PRODUCT_PHOTOS,
  maxReferenceVideo: MAX_REFERENCE_VIDEO,
  maxReferenceImages: MAX_REFERENCE_IMAGES,
} as const;
