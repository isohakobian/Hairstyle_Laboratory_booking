import { storageGetSignedUrl, storagePut } from "./storage";

const SUPPORTED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

type SupportedReceiptType = typeof SUPPORTED_RECEIPT_TYPES[number];

function receiptExtension(mimeType: string) {
  const extensions: Record<SupportedReceiptType, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!SUPPORTED_RECEIPT_TYPES.includes(mimeType as SupportedReceiptType)) {
    throw new Error("Only JPEG, PNG, and WebP receipt images are supported");
  }
  return extensions[mimeType as SupportedReceiptType];
}

export type ManualDepositReceiptInput = {
  referenceNumber: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
};

export async function storeManualDepositReceipt(input: ManualDepositReceiptInput) {
  const extension = receiptExtension(input.mimeType);
  const content = Buffer.from(input.base64Data, "base64");
  if (content.length === 0 || content.length > MAX_RECEIPT_BYTES) {
    throw new Error("Receipt image must be smaller than 5 MB");
  }
  const stored = await storagePut(
    `private/manual-deposits/${input.referenceNumber}/receipt.${extension}`,
    content,
    input.mimeType,
  );
  return {
    storageKey: stored.key,
    fileName: input.fileName.slice(0, 255),
    mimeType: input.mimeType as SupportedReceiptType,
    content,
  };
}

export async function getManualDepositReceiptUrl(storageKey: string) {
  return storageGetSignedUrl(storageKey);
}
