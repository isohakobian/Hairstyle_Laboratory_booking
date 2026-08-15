import { describe, expect, it } from "vitest";
import { buildAppointmentReminderEmail, buildClientBookingEmail, buildConfiguredReviewRequestEmail, buildOwnerBookingEmail, buildRepeatFollowUpEmail, buildReviewRequestEmail, buildWeeklyBookingSummaryEmail } from "./bookingEmail";

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

  it("renders an admin-edited review template with permitted placeholders", () => {
    const email = buildConfiguredReviewRequestEmail(booking, "https://example.com/review?token=secure-token", {
      subjectRu: "Спасибо, {{clientName}}",
      subjectEn: "Thank you, {{clientName}}",
      bodyRu: "Визит: {{serviceName}} {{bookingDate}} {{bookingTime}}\n{{reviewUrl}}",
      bodyEn: "Visit: {{serviceName}}\n{{reviewUrl}}",
    });

    expect(email.subject).toBe("Thank you, Isaac <Client>");
    expect(email.text).toContain("Haircut 2026-09-10 14:00");
    expect(email.text).toContain("https://example.com/review?token=secure-token");
    expect(email.html).toContain("Isaac &lt;Client&gt;");
  });

  it("creates a personal bilingual repeat-booking invitation", () => {
    const email = buildRepeatFollowUpEmail(booking, "https://example.com/booking");

    expect(email.subject).toBe("Ready for your next visit? — Isaac");
    expect(email.text).toContain("I would love to see you again.");
    expect(email.text).toContain("буду рад снова вас видеть");
    expect(email.html).toContain("https://example.com/booking");
    expect(email.html).toContain("Isaac &lt;Client&gt;");
  });

  it("creates a bilingual appointment reminder with booking details", () => {
    const email = buildAppointmentReminderEmail(booking, "https://example.com/status");

    expect(email.subject).toContain("visit is tomorrow");
    expect(email.text).toContain("Напоминаю, что ваша запись ко мне завтра.");
    expect(email.text).toContain("https://example.com/status");
    expect(email.html).toContain("Isaac &lt;Client&gt;");
  });

  it("changes the reminder copy when the visit is in two hours", () => {
    const email = buildAppointmentReminderEmail(booking, "https://example.com/status", 120);

    expect(email.subject).toContain("in 2 hours");
    expect(email.text).toContain("примерно через 2 ч.");
  });

  it("creates an owner weekly summary with the main booking metrics", () => {
    const email = buildWeeklyBookingSummaryEmail({
      start: new Date("2026-08-03T20:00:00.000Z"), end: new Date("2026-08-10T20:00:00.000Z"),
      newBookings: 8, cancelledBookings: 2, pendingBookings: 1, confirmedBookings: 4, completedBookings: 6,
    });

    expect(email.subject).toContain("Weekly booking summary");
    expect(email.text).toContain("New requests / Новые заявки: 8");
    expect(email.text).toContain("Cancelled / Отменено: 2");
    expect(email.html).toContain("Confirmed now / Подтверждено");
  });
});
