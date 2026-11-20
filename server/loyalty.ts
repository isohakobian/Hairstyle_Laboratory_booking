import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { bookings, clients, loyaltyRedemptions, loyaltyRegistrations, manualVisits } from "../drizzle/schema";
import { getDb } from "./db";
import { findOrCreateClient } from "./clientMemory";

function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createAccessToken() {
  return randomBytes(32).toString("hex");
}

export function calculateLoyaltyProgress(visitCount: number, rewardsUsed: number) {
  const rewardsEarned = Math.floor(visitCount / 5);
  return {
    stamps: visitCount % 5,
    visitsRemaining: visitCount % 5 === 0 && rewardsEarned > rewardsUsed ? 0 : 5 - (visitCount % 5),
    rewardsEarned,
    rewardsAvailable: Math.max(0, rewardsEarned - rewardsUsed),
    rewardsUsed,
  };
}

export async function registerLoyaltyMember(input: { name: string; phone: string; email: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const client = await findOrCreateClient({ name: input.name.trim(), phone: input.phone.trim(), email: input.email.trim().toLowerCase() });
  const accessToken = createAccessToken();
  const accessTokenHash = hashAccessToken(accessToken);
  await db.insert(loyaltyRegistrations).values({ clientId: client.id, accessTokenHash }).onDuplicateKeyUpdate({
    set: { accessTokenHash, updatedAt: new Date() },
  });
  return { accessToken, name: client.name };
}

export async function getLoyaltyMember(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const registration = (await db.select().from(loyaltyRegistrations).where(eq(loyaltyRegistrations.accessTokenHash, hashAccessToken(token))).limit(1))[0];
  if (!registration) return null;
  const client = (await db.select().from(clients).where(eq(clients.id, registration.clientId)).limit(1))[0];
  if (!client) return null;
  const [completedBookings, historicalVisits, redemptions] = await Promise.all([
    db.select({ id: bookings.id, bookingDate: bookings.bookingDate, serviceName: bookings.serviceName }).from(bookings).where(and(eq(bookings.clientId, client.id), eq(bookings.status, "completed"))).orderBy(desc(bookings.bookingDate)),
    db.select({ id: manualVisits.id, visitDate: manualVisits.visitDate, serviceName: manualVisits.serviceName }).from(manualVisits).where(eq(manualVisits.clientId, client.id)).orderBy(desc(manualVisits.visitDate)),
    db.select({ id: loyaltyRedemptions.id, rewardAmountAmd: loyaltyRedemptions.rewardAmountAmd, redeemedAt: loyaltyRedemptions.redeemedAt }).from(loyaltyRedemptions).where(eq(loyaltyRedemptions.clientId, client.id)).orderBy(desc(loyaltyRedemptions.redeemedAt)),
  ]);
  const visitCount = completedBookings.length + historicalVisits.length;
  const progress = calculateLoyaltyProgress(visitCount, redemptions.length);
  return {
    name: client.name,
    enrolledAt: registration.enrolledAt,
    visitCount,
    ...progress,
    rewardAmountAmd: 10000,
    visits: [...completedBookings.map(visit => ({ date: visit.bookingDate, serviceName: visit.serviceName })), ...historicalVisits.map(visit => ({ date: visit.visitDate, serviceName: visit.serviceName }))].slice(0, 12),
    redemptions,
  };
}
