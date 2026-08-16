import { storageGetSignedUrl, storagePut } from "./storage";

const SUPPORTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type SupportedPhotoType = typeof SUPPORTED_PHOTO_TYPES[number];

function photoExtension(mimeType: string) {
  const extensions: Record<SupportedPhotoType, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!SUPPORTED_PHOTO_TYPES.includes(mimeType as SupportedPhotoType)) {
    throw new Error("Only JPEG, PNG, and WebP reference photos are supported");
  }
  return extensions[mimeType as SupportedPhotoType];
}

export type ReferencePhotoInput = {
  referenceNumber: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
};

export async function storeReferencePhoto(input: ReferencePhotoInput) {
  const extension = photoExtension(input.mimeType);
  const content = Buffer.from(input.base64Data, "base64");
  if (content.length === 0 || content.length > MAX_PHOTO_BYTES) {
    throw new Error("Reference photo must be smaller than 8 MB");
  }
  const stored = await storagePut(
    `private/reference-photos/${input.referenceNumber}/reference.${extension}`,
    content,
    input.mimeType,
  );
  return {
    storageKey: stored.key,
    fileName: input.fileName.slice(0, 255),
    mimeType: input.mimeType as SupportedPhotoType,
  };
}

export async function getReferencePhotoUrl(storageKey: string) {
  return storageGetSignedUrl(storageKey);
}
