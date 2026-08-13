import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { clearExampleTestBookings } from "./testCleanup";

const { sendBookingEmails } = vi.hoisted(() => ({
  sendBookingEmails: vi.fn().mockResolvedValue({ skipped: false }),
}));

vi.mock("./bookingEmail", () => ({ sendBookingEmails }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(undefined) }));

import { appRouter } from "./routers";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("booking email delivery contract", () => {
  beforeEach(() => {
    sendBookingEmails.mockClear();
  });

  afterAll(async () => {
    await clearExampleTestBookings();
  });

  it("passes the client email from a booking payload into the email delivery flow", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const clientEmail = "booking-confirmation@example.com";
    const services = await caller.services.list();
    const haircutId = services.find((service) => service.nameEn === "Haircut")?.id;
    if (!haircutId) throw new Error("Haircut service is not available");

    await caller.bookings.create({
      serviceIds: [haircutId],
      bookingDate: "2099-12-29",
      bookingTime: "09:00",
      clientName: "Email Contract Client",
      clientPhone: "+37455000000",
      clientEmail,
    });

    expect(sendBookingEmails).toHaveBeenCalledWith(expect.objectContaining({
      clientEmail,
      serviceName: "Haircut",
      bookingDate: "2099-12-29",
      bookingTime: "09:00",
    }));
  });
});
