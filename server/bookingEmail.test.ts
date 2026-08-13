import { describe, expect, it } from "vitest";
import { buildClientBookingEmail, buildOwnerBookingEmail } from "./bookingEmail";

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
});
