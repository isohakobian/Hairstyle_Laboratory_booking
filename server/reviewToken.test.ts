import { describe, expect, it } from "vitest";
import { createReviewTokenValue, getReviewTokenExpiry, hashReviewToken } from "./reviewToken";

describe("review token", () => {
  it("creates random SHA-256-hashable tokens with a thirty-day expiry", () => {
    const first = createReviewTokenValue();
    const second = createReviewTokenValue();

    expect(first).not.toBe(second);
    expect(hashReviewToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(getReviewTokenExpiry().getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
  });
});
