import { NextResponse } from "next/server";
import { storeAsset } from "@/lib/assets/storage";
import {
  validateLogo,
  validateProductPhoto,
  validateReferenceVideo,
  validateReferenceImage,
  validateBufferCorrupt,
  limits,
} from "@/lib/assets/validation";
import type { AssetMetadata } from "@/lib/assets/types";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "upload");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart body." },
      { status: 400 }
    );
  }

  const uploaded: AssetMetadata[] = [];
  const errors: string[] = [];

  const logoFiles = formData.getAll("logo").filter((f): f is File => f instanceof File && f.size > 0);
  if (logoFiles.length > limits.maxLogo) {
    errors.push("Too many files for logo.");
  } else if (logoFiles.length > 0) {
    const logo = logoFiles[0];
    const err = validateLogo(logo);
    if (err) {
      errors.push(err);
    } else {
      const buffer = Buffer.from(await logo.arrayBuffer());
      const corruptErr = validateBufferCorrupt(buffer, logo.type, logo.name);
      if (corruptErr) {
        errors.push(corruptErr);
      } else {
        const meta = storeAsset(buffer, "logo", logo.name, logo.type);
        uploaded.push(meta);
      }
    }
  }

  const productPhotos = formData.getAll("productPhotos");
  const productFiles = productPhotos.filter((f): f is File => f instanceof File && f.size > 0);
  if (productFiles.length > limits.maxProductPhotos) {
    errors.push("Too many files for product photos.");
  } else {
    for (const file of productFiles) {
      const err = validateProductPhoto(file);
      if (err) {
        errors.push(err);
        break;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const corruptErr = validateBufferCorrupt(buffer, file.type, file.name);
      if (corruptErr) {
        errors.push(corruptErr);
        break;
      }
      const meta = storeAsset(buffer, "productPhoto", file.name, file.type);
      uploaded.push(meta);
    }
  }

  const refVideoFiles = formData.getAll("referenceVideo").filter((f): f is File => f instanceof File && f.size > 0);
  if (refVideoFiles.length > limits.maxReferenceVideo) {
    errors.push("Too many files for reference video.");
  } else if (refVideoFiles.length > 0) {
    const referenceVideo = refVideoFiles[0];
    const err = validateReferenceVideo(referenceVideo);
    if (err) {
      errors.push(err);
    } else {
      const buffer = Buffer.from(await referenceVideo.arrayBuffer());
      const corruptErr = validateBufferCorrupt(buffer, referenceVideo.type, referenceVideo.name);
      if (corruptErr) {
        errors.push(corruptErr);
      } else {
        const meta = storeAsset(buffer, "referenceVideo", referenceVideo.name, referenceVideo.type);
        uploaded.push(meta);
      }
    }
  }

  const referenceImages = formData.getAll("referenceImages");
  const refImageFiles = referenceImages.filter((f): f is File => f instanceof File && f.size > 0);
  if (refImageFiles.length > limits.maxReferenceImages) {
    errors.push("Too many files for reference images.");
  } else {
    for (const file of refImageFiles) {
      const err = validateReferenceImage(file);
      if (err) {
        errors.push(err);
        break;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const corruptErr = validateBufferCorrupt(buffer, file.type, file.name);
      if (corruptErr) {
        errors.push(corruptErr);
        break;
      }
      const meta = storeAsset(buffer, "referenceImage", file.name, file.type);
      uploaded.push(meta);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.join(" ") },
      { status: 400 }
    );
  }

  const assetIds = uploaded.map((a) => a.id);
  return NextResponse.json({
    assetIds,
    assets: uploaded.map((a) => ({ id: a.id, type: a.type, path: a.path })),
  });
}
