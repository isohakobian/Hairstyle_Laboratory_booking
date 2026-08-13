import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getDue: vi.fn(),
  claim: vi.fn(),
  markSent: vi.fn(),
  releaseClaim: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("./db", () => ({
  getRepeatFollowUpDueBookings: mocks.getDue,
  claimRepeatFollowUp: mocks.claim,
  markRepeatFollowUpSent: mocks.markSent,
  releaseRepeatFollowUpClaim: mocks.releaseClaim,
}));

vi.mock("./bookingEmail", () => ({
  sendRepeatFollowUpEmail: mocks.sendEmail,
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));

import { getYerevanDateDaysAgo, repeatFollowUpHandler } from "./handlers/repeatFollowUp";

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("repeat follow-up scheduled handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-repeat-1" });
    mocks.getDue.mockResolvedValue([]);
    mocks.claim.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.markSent.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.releaseClaim.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.sendEmail.mockResolvedValue({ messageId: "email-1" });
  });

  it("calculates the target visit date in Yerevan time", () => {
    expect(getYerevanDateDaysAgo(98, new Date("2026-08-14T06:00:00.000Z"))).toBe("2026-05-08");
  });

  it("rejects non-cron callers", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const response = createResponse();

    await repeatFollowUpHandler({ originalUrl: "/api/scheduled/repeat-follow-up" } as never, response as never);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(mocks.getDue).not.toHaveBeenCalled();
  });

  it("sends and records a due client booking only after obtaining the atomic claim", async () => {
    mocks.getDue.mockResolvedValue([{
      id: 42,
      referenceNumber: "HL-42",
      serviceName: "Haircut",
      serviceSummary: "Haircut + Beard Modeling",
      totalDurationMinutes: 90,
      totalPriceSummary: "27,000 ֏",
      bookingDate: "2026-05-08",
      bookingTime: "13:00",
      clientName: "Alex",
      clientPhone: "+37400000000",
      clientEmail: "alex@example.com",
      comment: null,
    }]);
    const response = createResponse();

    await repeatFollowUpHandler({ originalUrl: "/api/scheduled/repeat-follow-up" } as never, response as never);

    expect(mocks.claim).toHaveBeenCalledWith(42);
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      referenceNumber: "HL-42",
      serviceName: "Haircut + Beard Modeling",
      clientEmail: "alex@example.com",
    }), "https://isaacbarber-axczkyb2.manus.space/booking");
    expect(mocks.markSent).toHaveBeenCalledWith(42);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, sent: 1, checked: 1 }));
  });

  it("does not send when another execution already owns the booking claim", async () => {
    mocks.getDue.mockResolvedValue([{ id: 42, clientEmail: "alex@example.com" }]);
    mocks.claim.mockResolvedValue([{ affectedRows: 0 }]);
    const response = createResponse();

    await repeatFollowUpHandler({ originalUrl: "/api/scheduled/repeat-follow-up" } as never, response as never);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.markSent).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, sent: 0, skipped: 1 }));
  });

  it("releases the claim and returns a retryable error if delivery fails", async () => {
    mocks.getDue.mockResolvedValue([{
      id: 42,
      referenceNumber: "HL-42",
      serviceName: "Haircut",
      bookingDate: "2026-05-08",
      bookingTime: "13:00",
      clientName: "Alex",
      clientPhone: "+37400000000",
      clientEmail: "alex@example.com",
      comment: null,
    }]);
    mocks.sendEmail.mockRejectedValue(new Error("SMTP unavailable"));
    const response = createResponse();

    await repeatFollowUpHandler({ originalUrl: "/api/scheduled/repeat-follow-up" } as never, response as never);

    expect(mocks.releaseClaim).toHaveBeenCalledWith(42);
    expect(mocks.markSent).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
  });
});
