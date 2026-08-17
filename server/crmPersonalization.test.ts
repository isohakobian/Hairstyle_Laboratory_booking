import { describe, expect, it } from "vitest";
import { buildCrmBroadcastEmail } from "./bookingEmail";

describe("CRM campaign personalization", () => {
  it("replaces client name and booking URL in subject and bilingual body", () => {
    const email = buildCrmBroadcastEmail({
      clientName: "Alex",
      subjectRu: "Привет, {{clientName}}",
      subjectEn: "A note for {{clientName}}",
      bodyRu: "{{clientName}}, выбрать время: {{bookingUrl}}",
      bodyEn: "Hi {{clientName}}, book here: {{bookingUrl}}",
      actionUrl: "https://example.com/booking",
      actionLabelRu: "Выбрать время",
      actionLabelEn: "Choose a time",
    });

    expect(email.subject).toBe("A note for Alex");
    expect(email.text).toContain("Hi Alex, book here: https://example.com/booking");
    expect(email.text).toContain("Alex, выбрать время: https://example.com/booking");
    expect(email.html).toContain("Hi Alex, book here: https://example.com/booking");
    expect(email.html).not.toContain("{{clientName}}");
    expect(email.html).not.toContain("{{bookingUrl}}");
  });
});
