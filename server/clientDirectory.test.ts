import { afterAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { clearExampleTestBookings } from "./testCleanup";

function adminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "client-directory-test-admin",
      email: "admin@example.com",
      name: "Test Admin",
      loginMethod: "test",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Admin client directory", () => {
  afterAll(async () => {
    await clearExampleTestBookings();
  });

  it("creates a manual client, updates the same phone instead of duplicating, and reports stats", async () => {
    const admin = appRouter.createCaller(adminContext());
    const first = await admin.admin.createClient({
      name: "Manual Directory Client",
      phone: "+37455000777",
      email: "manual-directory@example.com",
      instagram: "@manualclient",
      stylistNotes: "Prefers a clean low fade",
    });
    expect(first.created).toBe(true);
    expect(first.client.name).toBe("Manual Directory Client");

    const updated = await admin.admin.createClient({
      name: "Manual Directory Client Updated",
      phone: "+374 55 000 777",
      email: "manual-directory@example.com",
    });
    expect(updated.created).toBe(false);
    expect(updated.client.id).toBe(first.client.id);
    expect(updated.client.name).toBe("Manual Directory Client Updated");

    const visit = await admin.admin.createManualVisit({
      clientId: first.client.id,
      visitDate: "2025-06-15",
      serviceName: "Haircut",
      priceAmd: 15000,
      paidAmd: 15000,
      note: "Classic cut",
    });
    expect(visit.serviceName).toBe("Haircut");
    expect(visit.paidAmd).toBe(15000);

    const stats = await admin.admin.clientStats();
    expect(stats.totalClients).toBeGreaterThanOrEqual(1);
    expect(stats.totalVisits).toBeGreaterThanOrEqual(1);
    expect(stats.completedVisits).toBeGreaterThanOrEqual(1);
    expect(stats.totalRevenueAmd).toBeGreaterThanOrEqual(15000);
    expect(stats.averageCheckAmd).toBeGreaterThanOrEqual(0);

    const edited = await admin.admin.updateManualVisit({ id: visit.id, visitDate: "2025-06-16", serviceName: "Beard Modeling", priceAmd: 12000, paidAmd: 10000, note: "Updated note" });
    expect(edited.serviceName).toBe("Beard Modeling");
    expect(edited.paidAmd).toBe(10000);

    const deleted = await admin.admin.deleteManualVisit({ id: visit.id });
    expect(deleted.success).toBe(true);
    const visitsAfterDelete = await admin.admin.manualVisits({ clientId: first.client.id });
    expect(visitsAfterDelete.some(item => item.id === visit.id)).toBe(false);
  });
});
