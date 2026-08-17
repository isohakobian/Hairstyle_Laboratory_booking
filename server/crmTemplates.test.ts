import { describe, expect, it, vi } from "vitest";
import { defaultBirthdayEmailTemplate, defaultPostVisitEmailTemplate } from "./db";

describe("CRM template defaults", () => {
  it("provides valid default templates for post-visit and birthday emails", () => {
    expect(defaultPostVisitEmailTemplate.subjectRu).toContain("результат");
    expect(defaultPostVisitEmailTemplate.bodyRu).toContain("{{clientName}}");
    expect(defaultBirthdayEmailTemplate.subjectEn).toContain("birthday");
    expect(defaultBirthdayEmailTemplate.bodyEn).toContain("{{bookingUrl}}");
  });
});
