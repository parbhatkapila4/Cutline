import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AssetMetadata, AssetType } from "./types";

const REGISTRY_FILENAME = "_registry.json";
const DEFAULT_UPLOAD_DIR = "uploads";

function getUploadDir(): string {
  const cwd = process.cwd();
  const dir = process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR;
  return path.join(cwd, dir);
}

function getRegistryPath(): string {
  return path.join(getUploadDir(), REGISTRY_FILENAME);
}

type Registry = Record<string, AssetMetadata>;

function readRegistry(): Registry {
  const registryPath = getRegistryPath();
  try {
    const raw = fs.readFileSync(registryPath, "utf-8");
    return JSON.parse(raw) as Registry;
  } catch {
    return {};
  }
}

function writeRegistry(registry: Registry): void {
  const dir = getUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, REGISTRY_FILENAME),
    JSON.stringify(registry, null, 0),
    "utf-8"
  );
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return map[mimeType] ?? "bin";
}

export function storeAsset(
  buffer: Buffer,
  type: AssetType,
  originalFilename: string,
  mimeType: string
): AssetMetadata {
  const dir = getUploadDir();
  fs.mkdirSync(dir, { recursive: true });

  const id = randomUUID();
  const ext = getExtension(mimeType);
  const filename = `${id}.${ext}`;
  const filePath = path.join(dir, filename);
  const relativePath = path.join(path.basename(dir), filename);

  fs.writeFileSync(filePath, buffer);

  const metadata: AssetMetadata = {
    id,
    type,
    path: relativePath,
    originalFilename,
    mimeType,
  };

  const registry = readRegistry();
  registry[id] = metadata;
  writeRegistry(registry);

  return metadata;
}

export function getAssetMetadata(assetId: string): AssetMetadata | null {
  const registry = readRegistry();
  return registry[assetId] ?? null;
}

export function getAssetFilePath(assetId: string): string | null {
  const meta = getAssetMetadata(assetId);
  if (!meta) return null;
  const storageType = process.env.STORAGE_TYPE ?? "local";
  if (storageType !== "local") return null;
  const dir = getUploadDir();
  const filename = path.basename(meta.path);
  const fullPath = path.join(dir, filename);
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

export function cleanupOldUploads(): void {
}
