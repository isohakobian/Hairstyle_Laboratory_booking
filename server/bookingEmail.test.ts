import { describe, expect, it } from "vitest";
import { buildClientBookingEmail, buildOwnerBookingEmail, buildReviewRequestEmail } from "./bookingEmail";

const booking = {
  referenceNumber: "ABC123",
  serviceName: "Haircut",
  bookingDate: "2026-09-10",
  bookingTime: "14:00",
  clientName: "Isaac <Client>",
  clientPhone: "+37400000000",
  clientEmail: "client@example.com",
  comment: "Please call first",
};

describe("booking email templates", () => {
  it("creates an owner notification with client and booking details", () => {
    const email = buildOwnerBookingEmail(booking);

    expect(email.subject).toContain("New booking request");
    expect(email.text).toContain("client@example.com");
    expect(email.text).toContain("ABC123");
    expect(email.html).toContain("Please call first");
  });

  it("creates a bilingual client confirmation and escapes client content", () => {
    const email = buildClientBookingEmail(booking);

    expect(email.subject).toContain("Hairstyle Laboratory");
    expect(email.text).toContain("Спасибо за вашу запись");
    expect(email.html).toContain("Isaac &lt;Client&gt;");
    expect(email.html).not.toContain("Isaac <Client>");
  });

  it("creates a warm first-person review request from Isaac", () => {
    const email = buildReviewRequestEmail(booking, "https://example.com/review?token=secure-token");

    expect(email.subject).toBe("Thank you for your visit — Isaac");
    expect(email.text).toContain("Thank you for trusting me with your appointment.");
    expect(email.text).toContain("I'd love your honest feedback.");
    expect(email.text).toContain("Thank you again,\nIsaac");
    expect(email.html).toContain("ISAAC HAKOBIAN");
    expect(email.html).toContain("https://example.com/review?token=secure-token");
  });
});
