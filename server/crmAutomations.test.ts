import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getBirthday: vi.fn(),
  getPostVisit: vi.fn(),
  claim: vi.fn(),
  markSent: vi.fn(),
  releaseClaim: vi.fn(),
  recordDelivery: vi.fn(),
  sendEmail: vi.fn(),
  buildBirthday: vi.fn(() => ({ subject: "Birthday", text: "birthday", html: "<p>birthday</p>" })),
  buildPostVisit: vi.fn(() => ({ subject: "Check in", text: "check in", html: "<p>check in</p>" })),
}));

const mockTemplates = vi.hoisted(() => ({
  getPostVisitTemplate: vi.fn(async () => ({ subjectRu: "RU", subjectEn: "EN", bodyRu: "RU", bodyEn: "EN" })),
  getBirthdayTemplate: vi.fn(async () => ({ subjectRu: "RU", subjectEn: "EN", bodyRu: "RU", bodyEn: "EN" })),
}));

vi.mock("./db", () => ({
  getBirthdayCrmCandidates: mocks.getBirthday,
  getPostVisitCrmCandidates: mocks.getPostVisit,
  getBirthdayEmailTemplate: mockTemplates.getBirthdayTemplate,
  getPostVisitEmailTemplate: mockTemplates.getPostVisitTemplate,
  claimAutomationEmailDelivery: mocks.claim,
  markAutomationEmailDeliverySent: mocks.markSent,
  releaseAutomationEmailDeliveryClaim: mocks.releaseClaim,
  recordClientEmailDelivery: mocks.recordDelivery,
}));

vi.mock("./bookingEmail", () => ({
  buildBirthdayGreetingEmail: mocks.buildBirthday,
  buildPostVisitCheckInEmail: mocks.buildPostVisit,
  buildConfiguredBirthdayEmail: mocks.buildBirthday,
  buildConfiguredPostVisitEmail: mocks.buildPostVisit,
  sendCrmEmail: mocks.sendEmail,
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));

import { crmAutomationsHandler, getYerevanDateDaysAgo } from "./handlers/crmAutomations";

function createResponse() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("CRM scheduled automations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-crm-1" });
    mocks.getBirthday.mockResolvedValue([]);
    mocks.getPostVisit.mockResolvedValue([]);
    mocks.claim.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.markSent.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.releaseClaim.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.recordDelivery.mockResolvedValue(undefined);
    mocks.sendEmail.mockResolvedValue({ messageId: "crm-mail-1" });
  });

  it("calculates the 14-day target date in Yerevan time", () => {
    expect(getYerevanDateDaysAgo(14, new Date("2026-08-17T21:00:00.000Z"))).toBe("2026-08-04");
  });

  it("rejects non-cron callers", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const response = createResponse();
    await crmAutomationsHandler({ originalUrl: "/api/scheduled/crm-automations" } as never, response as never);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(mocks.getPostVisit).not.toHaveBeenCalled();
  });

  it("sends post-visit and birthday messages after separate claims", async () => {
    mocks.getPostVisit.mockResolvedValue([{ booking: { id: 12 }, client: { id: 7, name: "Alex", email: "alex@example.com" }, preference: { newsletterConsented: "yes" } }]);
    mocks.getBirthday.mockResolvedValue([{ client: { id: 7, name: "Alex", email: "alex@example.com" }, preference: { newsletterConsented: "yes" } }]);
    const response = createResponse();
    await crmAutomationsHandler({ originalUrl: "/api/scheduled/crm-automations" } as never, response as never);
    expect(mocks.claim).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.markSent).toHaveBeenCalledTimes(2);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("releases a failed claim and returns a retryable 500", async () => {
    mocks.getPostVisit.mockResolvedValue([{ booking: { id: 12 }, client: { id: 7, name: "Alex", email: "alex@example.com" }, preference: { newsletterConsented: "yes" } }]);
    mocks.sendEmail.mockRejectedValue(new Error("SMTP unavailable"));
    const response = createResponse();
    await crmAutomationsHandler({ originalUrl: "/api/scheduled/crm-automations" } as never, response as never);
    expect(mocks.releaseClaim).toHaveBeenCalledTimes(1);
    expect(mocks.markSent).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
  });
});
