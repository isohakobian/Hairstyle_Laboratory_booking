import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(), getDue: vi.fn(), claimReminder: vi.fn(), markReminder: vi.fn(), releaseReminder: vi.fn(), sendReminder: vi.fn(),
  getReminderSettings: vi.fn(), getSecondaryDue: vi.fn(), claimSecondary: vi.fn(), markSecondary: vi.fn(), releaseSecondary: vi.fn(),
  claimSummary: vi.fn(), markSummary: vi.fn(), releaseSummary: vi.fn(), getSummary: vi.fn(), sendSummary: vi.fn(), recordDelivery: vi.fn(),
}));

vi.mock("./db", () => ({
  getAppointmentReminderDueBookings: mocks.getDue,
  claimAppointmentReminder: mocks.claimReminder,
  markAppointmentReminderSent: mocks.markReminder,
  releaseAppointmentReminderClaim: mocks.releaseReminder,
  getBookingReminderSettings: mocks.getReminderSettings,
  getAdditionalReminderDueBookings: mocks.getSecondaryDue,
  claimAdditionalReminder: mocks.claimSecondary,
  markAdditionalReminderSent: mocks.markSecondary,
  releaseAdditionalReminderClaim: mocks.releaseSecondary,
  claimAutomationEmailDelivery: mocks.claimSummary,
  markAutomationEmailDeliverySent: mocks.markSummary,
  releaseAutomationEmailDeliveryClaim: mocks.releaseSummary,
  getWeeklyBookingSummary: mocks.getSummary,
  recordClientEmailDelivery: mocks.recordDelivery,
}));
vi.mock("./bookingEmail", () => ({ sendAppointmentReminderEmail: mocks.sendReminder, sendWeeklyBookingSummaryEmail: mocks.sendSummary }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));

import { appointmentReminderHandler, getPreviousYerevanWeek, getYerevanReminderWindow, weeklyBookingSummaryHandler } from "./handlers/scheduledEmails";

function createResponse() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("scheduled appointment emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "scheduled-task" });
    mocks.getDue.mockResolvedValue([]);
    mocks.getSecondaryDue.mockResolvedValue([]);
    mocks.getReminderSettings.mockResolvedValue({ firstOffsetMinutes: 1440, firstEnabled: "yes", secondOffsetMinutes: 120, secondEnabled: "yes" });
    mocks.claimReminder.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.markReminder.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.releaseReminder.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.claimSecondary.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.markSecondary.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.releaseSecondary.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.sendReminder.mockResolvedValue({ messageId: "reminder-1" });
    mocks.claimSummary.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.markSummary.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.releaseSummary.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.getSummary.mockResolvedValue({ start: new Date("2026-08-03T20:00:00.000Z"), end: new Date("2026-08-10T20:00:00.000Z"), newBookings: 8, cancelledBookings: 2, pendingBookings: 1, confirmedBookings: 4, completedBookings: 6 });
    mocks.sendSummary.mockResolvedValue({ messageId: "summary-1" });
    mocks.recordDelivery.mockResolvedValue([{ affectedRows: 1 }]);
  });

  it("uses a 30-minute Yerevan appointment window for next-day reminders", () => {
    expect(getYerevanReminderWindow(new Date("2026-08-14T06:00:00.000Z"))).toEqual({ bookingDate: "2026-08-15", startTime: "10:00", endTime: "10:30" });
  });

  it("sends and records a due reminder only after claiming the booking", async () => {
    mocks.getDue.mockResolvedValue([{ id: 42, referenceNumber: "HL-42", serviceName: "Haircut", serviceSummary: "Haircut", totalDurationMinutes: 45, totalPriceSummary: "15,000 ֏", bookingDate: "2026-08-15", bookingTime: "10:00", clientName: "Alex", clientPhone: "+37400000000", clientEmail: "alex@example.com", comment: null }]);
    const response = createResponse();

    await appointmentReminderHandler({ originalUrl: "/api/scheduled/appointment-reminders" } as never, response as never);

    expect(mocks.claimReminder).toHaveBeenCalledWith(42);
    expect(mocks.sendReminder).toHaveBeenCalledWith(expect.objectContaining({ referenceNumber: "HL-42", clientEmail: "alex@example.com" }), "https://isaacbarber-axczkyb2.manus.space/status", 1440);
    expect(mocks.markReminder).toHaveBeenCalledWith(42);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, sent: 1 }));
  });

  it("does not send a duplicate reminder when another execution owns the claim", async () => {
    mocks.getDue.mockResolvedValue([{ id: 42, clientEmail: "alex@example.com" }]);
    mocks.claimReminder.mockResolvedValue([{ affectedRows: 0 }]);
    const response = createResponse();

    await appointmentReminderHandler({ originalUrl: "/api/scheduled/appointment-reminders" } as never, response as never);

    expect(mocks.sendReminder).not.toHaveBeenCalled();
    expect(mocks.markReminder).not.toHaveBeenCalled();
  });

  it("sends and records the separately claimed two-hour reminder", async () => {
    mocks.getSecondaryDue.mockResolvedValue([{ id: 73, referenceNumber: "HL-73", serviceName: "Haircut", serviceSummary: "Haircut", totalDurationMinutes: 45, totalPriceSummary: "15,000 ֏", bookingDate: "2026-08-14", bookingTime: "12:00", clientName: "Mia", clientPhone: "+37400000001", clientEmail: "mia@example.com", comment: null }]);
    const response = createResponse();

    await appointmentReminderHandler({ originalUrl: "/api/scheduled/appointment-reminders" } as never, response as never);

    expect(mocks.claimSecondary).toHaveBeenCalledWith(73, 120);
    expect(mocks.sendReminder).toHaveBeenCalledWith(expect.objectContaining({ referenceNumber: "HL-73", clientEmail: "mia@example.com" }), "https://isaacbarber-axczkyb2.manus.space/status", 120);
    expect(mocks.markSecondary).toHaveBeenCalledWith(73, 120);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ secondSent: 1, secondChecked: 1 }));
  });

  it("releases a reminder claim and exposes a retryable failure when delivery fails", async () => {
    mocks.getDue.mockResolvedValue([{ id: 42, referenceNumber: "HL-42", serviceName: "Haircut", bookingDate: "2026-08-15", bookingTime: "10:00", clientName: "Alex", clientPhone: "+37400000000", clientEmail: "alex@example.com", comment: null }]);
    mocks.sendReminder.mockRejectedValue(new Error("SMTP unavailable"));
    const response = createResponse();

    await appointmentReminderHandler({ originalUrl: "/api/scheduled/appointment-reminders" } as never, response as never);

    expect(mocks.releaseReminder).toHaveBeenCalledWith(42);
    expect(response.status).toHaveBeenCalledWith(500);
  });

  it("summarises the previous complete Yerevan week and records its delivery", async () => {
    const period = getPreviousYerevanWeek(new Date("2026-08-17T06:00:00.000Z"));
    expect(period.deliveryKey).toBe("weekly-summary:2026-08-09");
    const response = createResponse();

    await weeklyBookingSummaryHandler({ originalUrl: "/api/scheduled/weekly-booking-summary" } as never, response as never);

    expect(mocks.getSummary).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
    expect(mocks.sendSummary).toHaveBeenCalledWith(expect.objectContaining({ newBookings: 8, cancelledBookings: 2 }));
    expect(mocks.markSummary).toHaveBeenCalledWith(expect.stringMatching(/^weekly-summary:/));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
