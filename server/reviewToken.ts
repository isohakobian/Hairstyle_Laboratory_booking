import { createHash, randomBytes } from "crypto";

export function createReviewTokenValue() {
  return randomBytes(32).toString("base64url");
}

export function hashReviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getReviewTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt;
}
