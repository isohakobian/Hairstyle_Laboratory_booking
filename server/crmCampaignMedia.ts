import { randomUUID } from "crypto";
import { storagePut } from "./storage";

function getCampaignImageExtension(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensions[mimeType];
  if (!extension) throw new Error("Only JPEG, PNG, and WebP images are supported");
  return extension;
}

export async function uploadCrmCampaignImage(input: {
  fileName: string;
  mimeType: string;
  base64Data: string;
}) {
  const extension = getCampaignImageExtension(input.mimeType);
  const data = Buffer.from(input.base64Data, "base64");
  const maxBytes = 1_200_000;
  if (data.length === 0 || data.length > maxBytes) throw new Error("Campaign image must be smaller than 1.2 MB");
  return storagePut(
    `public/crm-campaign-media/${Date.now()}-${randomUUID()}.${extension}`,
    data,
    input.mimeType,
  );
}
