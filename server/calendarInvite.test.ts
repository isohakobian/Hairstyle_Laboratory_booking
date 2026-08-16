import { describe, expect, it } from "vitest";
import { buildCalendarInvite } from "./calendarInvite";

describe("calendar invite", () => {
  it("creates an Asia/Yerevan calendar event using the full booking duration", () => {
    const invite = buildCalendarInvite({
      referenceNumber: "BOOK123",
      serviceName: "Haircut + Beard Modeling",
      totalDurationMinutes: 75,
      totalPriceSummary: "27,000 ֏",
      bookingDate: "2099-12-30",
      bookingTime: "14:00",
      clientName: "Calendar Client",
      clientPhone: "+37455000000",
    });

    expect(invite).toContain("DTSTART;TZID=Asia/Yerevan:20991230T140000");
    expect(invite).toContain("DTEND;TZID=Asia/Yerevan:20991230T151500");
    expect(invite).toContain("SUMMARY:Hairstyle Laboratory — Haircut + Beard Modeling");
    expect(invite).toContain("LOCATION:Armenia\\, Yerevan\\, Pushkin 44");
    expect(invite).toContain("Location: Armenia\\, Yerevan\\, Pushkin 44");
  });
});
