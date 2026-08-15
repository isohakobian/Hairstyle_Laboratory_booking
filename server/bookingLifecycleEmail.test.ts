import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { clearExampleTestBookings } from "./testCleanup";
import { createReviewToken } from "./db";
import { createReviewTokenValue, hashReviewToken } from "./reviewToken";
import { setAvailabilityForDates } from "./availability";

const { sendBookingEmails, sendBookingCancelledEmail, sendBookingRescheduledEmail, sendConfirmedBookingEmail, sendReviewRequestEmail } = vi.hoisted(() => ({
  sendBookingEmails: vi.fn().mockResolvedValue({ skipped: true }),
  sendBookingCancelledEmail: vi.fn().mockResolvedValue({ accepted: ["client@example.com"] }),
  sendBookingRescheduledEmail: vi.fn().mockResolvedValue({ accepted: ["client@example.com"] }),
  sendConfirmedBookingEmail: vi.fn().mockResolvedValue({ accepted: ["client@example.com"] }),
  sendReviewRequestEmail: vi.fn().mockResolvedValue({ accepted: ["client@example.com"] }),
}));

vi.mock("./bookingEmail", () => ({
  sendBookingEmails,
  sendBookingCancelledEmail,
  sendBookingRescheduledEmail,
  sendConfirmedBookingEmail,
  sendReviewRequestEmail,
}));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(undefined) }));

import { appRouter } from "./routers";

function context(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `lifecycle-${role}`,
      email: `${role}@example.com`,
      name: role,
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("booking lifecycle emails", () => {
  beforeEach(async () => {
    sendConfirmedBookingEmail.mockClear();
    sendBookingCancelledEmail.mockClear();
    sendBookingRescheduledEmail.mockClear();
    sendReviewRequestEmail.mockClear();
    await setAvailabilityForDates(["2099-12-30", "2099-12-31"], "09:00", "19:00", 30);
  });

  afterAll(async () => {
    await clearExampleTestBookings();
  });

  it("sends the calendar confirmation and the review request from admin actions", async () => {
    const publicCaller = appRouter.createCaller(context("user"));
    const services = await publicCaller.services.list();
    const haircutId = services.find((service) => service.nameEn === "Haircut")?.id;
    if (!haircutId) throw new Error("Haircut service is unavailable");

    const booking = await publicCaller.bookings.create({
      serviceIds: [haircutId],
      bookingDate: "2099-12-30",
      bookingTime: "14:00",
      clientName: "Lifecycle Client",
      clientPhone: "+37455000000",
      clientEmail: "lifecycle-client@example.com",
      policyAccepted: true,
    });
    const adminCaller = appRouter.createCaller(context("admin"));

    await adminCaller.admin.confirmBooking({ id: booking.id });
    expect(sendConfirmedBookingEmail).toHaveBeenCalledWith(expect.objectContaining({
      referenceNumber: booking.referenceNumber,
      clientEmail: "lifecycle-client@example.com",
      totalDurationMinutes: booking.totalDurationMinutes,
    }));

    await adminCaller.admin.rescheduleBooking({ id: booking.id, bookingDate: "2099-12-30", bookingTime: "15:00", note: "Updated availability" });
    expect(sendBookingRescheduledEmail).toHaveBeenCalledWith(
      expect.objectContaining({ referenceNumber: booking.referenceNumber, bookingDate: "2099-12-30", bookingTime: "15:00" }),
      "2099-12-30",
      "14:00",
    );

    await expect(adminCaller.admin.requestReview({ id: booking.id })).rejects.toThrow(/completed/i);
    await adminCaller.admin.completeBooking({ id: booking.id });

    await adminCaller.admin.requestReview({ id: booking.id });
    expect(sendReviewRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({ referenceNumber: booking.referenceNumber }),
      expect.stringMatching(/\/review\?token=[A-Za-z0-9_-]{32,}/),
    );

    const reviewUrl = sendReviewRequestEmail.mock.calls[0][1];
    const token = new URL(reviewUrl).searchParams.get("token");
    if (!token) throw new Error("Review token missing from request URL");

    await expect(publicCaller.reviews.submit({ token, rating: 5, text: "Great visit" })).resolves.toEqual({ success: true });
    await expect(publicCaller.reviews.submit({ token, rating: 5, text: "Repeated" })).rejects.toThrow(/invalid|used|expired/i);
  });

  it("notifies a client after their own cancellation without rolling back the cancellation if email fails", async () => {
    const publicCaller = appRouter.createCaller(context("user"));
    const services = await publicCaller.services.list();
    const haircutId = services.find((service) => service.nameEn === "Haircut")?.id;
    if (!haircutId) throw new Error("Haircut service is unavailable");
    const booking = await publicCaller.bookings.create({
      serviceIds: [haircutId], bookingDate: "2099-12-31", bookingTime: "14:00",
      clientName: "Cancellation Notice Client", clientPhone: "+37455000004", clientEmail: "cancellation-notice@example.com", policyAccepted: true,
    });
    sendBookingCancelledEmail.mockRejectedValueOnce(new Error("SMTP unavailable"));

    await expect(publicCaller.bookings.cancelByClient({ referenceNumber: booking.referenceNumber, clientEmail: "cancellation-notice@example.com", reason: "Plans changed" })).resolves.toEqual({ success: true });
    expect(sendBookingCancelledEmail).toHaveBeenCalledWith(expect.objectContaining({ referenceNumber: booking.referenceNumber }), "Plans changed");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect((await publicCaller.bookings.getByReference({ referenceNumber: booking.referenceNumber }))?.status).toBe("cancelled");
  });

  it("keeps the new time when the optional reschedule email cannot be delivered", async () => {
    const publicCaller = appRouter.createCaller(context("user"));
    const services = await publicCaller.services.list();
    const haircutId = services.find((service) => service.nameEn === "Haircut")?.id;
    if (!haircutId) throw new Error("Haircut service is unavailable");
    const booking = await publicCaller.bookings.create({
      serviceIds: [haircutId], bookingDate: "2099-12-31", bookingTime: "10:00",
      clientName: "Reschedule Notice Client", clientPhone: "+37455000005", clientEmail: "reschedule-notice@example.com", policyAccepted: true,
    });
    sendBookingRescheduledEmail.mockRejectedValueOnce(new Error("SMTP unavailable"));
    const adminCaller = appRouter.createCaller(context("admin"));

    await expect(adminCaller.admin.rescheduleBooking({ id: booking.id, bookingDate: "2099-12-31", bookingTime: "11:00" })).resolves.toEqual({ success: true });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect((await publicCaller.bookings.getByReference({ referenceNumber: booking.referenceNumber }))?.bookingTime).toBe("11:00");
  });

  it("rejects an expired one-time review link", async () => {
    const publicCaller = appRouter.createCaller(context("user"));
    const services = await publicCaller.services.list();
    const haircutId = services.find((service) => service.nameEn === "Haircut")?.id;
    if (!haircutId) throw new Error("Haircut service is unavailable");

    const booking = await publicCaller.bookings.create({
      serviceIds: [haircutId],
      bookingDate: "2099-12-31",
      bookingTime: "14:00",
      clientName: "Expired Token Client",
      clientPhone: "+37455000001",
      clientEmail: "expired-token@example.com",
      policyAccepted: true,
    });
    const adminCaller = appRouter.createCaller(context("admin"));
    await adminCaller.admin.confirmBooking({ id: booking.id });

    const expiredToken = createReviewTokenValue();
    await createReviewToken(booking.id, hashReviewToken(expiredToken), new Date(Date.now() - 60_000));

    await expect(publicCaller.reviews.submit({ token: expiredToken, rating: 5 })).rejects.toThrow(/invalid|expired/i);
  });
});
