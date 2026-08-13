import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { clearExampleTestBookings } from "./testCleanup";
import { createReviewToken } from "./db";
import { createReviewTokenValue, hashReviewToken } from "./reviewToken";

const { sendBookingEmails, sendConfirmedBookingEmail, sendReviewRequestEmail } = vi.hoisted(() => ({
  sendBookingEmails: vi.fn().mockResolvedValue({ skipped: true }),
  sendConfirmedBookingEmail: vi.fn().mockResolvedValue({ accepted: ["client@example.com"] }),
  sendReviewRequestEmail: vi.fn().mockResolvedValue({ accepted: ["client@example.com"] }),
}));

vi.mock("./bookingEmail", () => ({
  sendBookingEmails,
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
  beforeEach(() => {
    sendConfirmedBookingEmail.mockClear();
    sendReviewRequestEmail.mockClear();
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
    });
    const adminCaller = appRouter.createCaller(context("admin"));

    await adminCaller.admin.confirmBooking({ id: booking.id });
    expect(sendConfirmedBookingEmail).toHaveBeenCalledWith(expect.objectContaining({
      referenceNumber: booking.referenceNumber,
      clientEmail: "lifecycle-client@example.com",
      totalDurationMinutes: 45,
    }));

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
    });
    const adminCaller = appRouter.createCaller(context("admin"));
    await adminCaller.admin.confirmBooking({ id: booking.id });

    const expiredToken = createReviewTokenValue();
    await createReviewToken(booking.id, hashReviewToken(expiredToken), new Date(Date.now() - 60_000));

    await expect(publicCaller.reviews.submit({ token: expiredToken, rating: 5 })).rejects.toThrow(/invalid|expired/i);
  });
});
