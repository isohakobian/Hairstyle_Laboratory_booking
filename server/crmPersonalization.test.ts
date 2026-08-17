import { describe, expect, it } from "vitest";
import { buildCrmBroadcastEmail, buildCrmTestEmail } from "./bookingEmail";

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

  it("marks a test email without changing the campaign body", () => {
    const email = buildCrmTestEmail({
      subjectRu: "Новость",
      subjectEn: "News",
      bodyRu: "Текст {{clientName}}",
      bodyEn: "Copy for {{clientName}}",
      actionUrl: "https://example.com/booking",
    }, "Isaac");

    expect(email.subject).toBe("[TEST] News");
    expect(email.text).toContain("Copy for Isaac");
    expect(email.html).toContain("[TEST] News");
  });

  it("keeps supported rich text and strips unsafe HTML from the email body", () => {
    const email = buildCrmBroadcastEmail({
      clientName: "Alex",
      subjectRu: "Форматирование",
      subjectEn: "Formatting",
      bodyRu: '<strong>Важно</strong><ul><li>Первый пункт</li><li style="color:red">Второй пункт</li></ul><script>alert(1)</script>',
      bodyEn: '<span style="color:#A17A2C">Gold note</span><ol><li>First</li></ol><script>bad()</script>',
    });

    expect(email.html).toContain('<strong>Важно</strong>');
    expect(email.html).toContain('<span style="color:#A17A2C">Gold note</span>');
    expect(email.html).toContain('<ul><li>Первый пункт</li><li>Второй пункт</li></ul>');
    expect(email.html).toContain('<ol><li>First</li></ol>');
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain('• Первый пункт');
    expect(email.text).toContain('First');
  });

  it("renders an optional stored banner URL in the outgoing email", () => {
    const email = buildCrmBroadcastEmail({
      clientName: "Alex",
      subjectRu: "Новость",
      subjectEn: "News",
      bodyRu: "Текст",
      bodyEn: "Copy",
      imageUrl: "/manus-storage/public/crm-campaign-media/banner.webp",
    });

    expect(email.html).toContain('src="https://isaacbarber-axczkyb2.manus.space/manus-storage/public/crm-campaign-media/banner.webp"');
    expect(email.text).toContain("Campaign image: https://isaacbarber-axczkyb2.manus.space/manus-storage/public/crm-campaign-media/banner.webp");
  });
});
