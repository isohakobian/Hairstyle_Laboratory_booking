import { and, desc, eq, inArray } from "drizzle-orm";
import { bookingEvents, bookings, bookingServices, clients, reviewRequestHistory, reviews, visitMedia } from "../drizzle/schema";
import { getDb } from "./db";
import { getAvailableSlots } from "./availability";
import { storageGetSignedUrl, storagePut } from "./storage";

export type ClientIdentity = {
  name: string;
  phone: string;
  email?: string | null;
  birthday?: string | null;
  instagram?: string | null;
};

function lookupKeyForPhone(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized) throw new Error("Client phone is required");
  return `phone:${normalized}`;
}

export async function findOrCreateClient(identity: ClientIdentity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lookupKey = lookupKeyForPhone(identity.phone);
  const existing = await db.select().from(clients).where(eq(clients.lookupKey, lookupKey)).limit(1);

  if (existing[0]) {
    await db.update(clients).set({
      name: identity.name,
      phone: identity.phone,
      ...(identity.email ? { email: identity.email } : {}),
      ...(identity.birthday ? { birthday: identity.birthday } : {}),
      ...(identity.instagram ? { instagram: identity.instagram } : {}),
    }).where(eq(clients.id, existing[0].id));
    const updated = await db.select().from(clients).where(eq(clients.id, existing[0].id)).limit(1);
    return updated[0]!;
  }

  await db.insert(clients).values({
    lookupKey,
    name: identity.name,
    phone: identity.phone,
    email: identity.email || null,
    birthday: identity.birthday || null,
    instagram: identity.instagram || null,
  });
  const created = await db.select().from(clients).where(eq(clients.lookupKey, lookupKey)).limit(1);
  if (!created[0]) throw new Error("Client profile could not be created");
  return created[0];
}

export async function updateClientProfile(clientId: number, changes: {
  birthday?: string | null;
  instagram?: string | null;
  preferredHairLength?: string | null;
  preferredBeardShape?: string | null;
  preferredStyling?: string | null;
  dislikes?: string | null;
  skinSensitivity?: string | null;
  stylistNotes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(clients).set(changes).where(eq(clients.id, clientId));
}

export async function createBookingEvent(input: {
  bookingId: number;
  eventType: "created" | "confirmed" | "declined" | "cancelled" | "rescheduled" | "completed" | "note";
  previousDate?: string | null;
  previousTime?: string | null;
  nextDate?: string | null;
  nextTime?: string | null;
  note?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(bookingEvents).values(input);
}

export async function rescheduleBooking(bookingId: number, nextDate: string, nextTime: string, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = (await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0];
  if (!current) throw new Error("Booking not found");
  const openSlots = await getAvailableSlots(nextDate, current.totalDurationMinutes || 30, bookingId);
  if (!openSlots.includes(nextTime)) throw new Error("This time slot is not available");

  await db.update(bookings).set({ bookingDate: nextDate, bookingTime: nextTime }).where(eq(bookings.id, bookingId));
  await createBookingEvent({
    bookingId,
    eventType: "rescheduled",
    previousDate: current.bookingDate,
    previousTime: current.bookingTime,
    nextDate,
    nextTime,
    note: note || null,
  });
}

export async function completeBooking(bookingId: number, finalPriceAmd?: number, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookings).set({
    status: "completed",
    completedAt: new Date(),
    ...(typeof finalPriceAmd === "number" ? { finalPriceAmd } : {}),
  }).where(eq(bookings.id, bookingId));
  await createBookingEvent({ bookingId, eventType: "completed", note: note || null });
}

export async function recordReviewRequest(bookingId: number, recipientEmail: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(reviewRequestHistory).values({ bookingId, recipientEmail });
}

function getImageExtension(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensions[mimeType];
  if (!extension) throw new Error("Only JPEG, PNG, and WebP images are supported");
  return extension;
}

export async function uploadVisitMedia(input: {
  bookingId: number;
  mediaType: "before" | "after";
  fileName: string;
  mimeType: string;
  base64Data: string;
  caption?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const extension = getImageExtension(input.mimeType);
  const data = Buffer.from(input.base64Data, "base64");
  const maxBytes = 8 * 1024 * 1024;
  if (data.length === 0 || data.length > maxBytes) throw new Error("Image must be smaller than 8 MB");
  const stored = await storagePut(
    `private/visit-media/${input.bookingId}/${input.mediaType}.${extension}`,
    data,
    input.mimeType,
  );
  await db.insert(visitMedia).values({
    bookingId: input.bookingId,
    mediaType: input.mediaType,
    storageKey: stored.key,
    fileName: input.fileName.slice(0, 255),
    caption: input.caption || null,
  });
  return { key: stored.key };
}

export async function getSignedVisitMediaUrl(storageKey: string) {
  return storageGetSignedUrl(storageKey);
}

export async function getClientMemory(clientId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const profile = (await db.select().from(clients).where(eq(clients.id, clientId)).limit(1))[0];
  if (!profile) return undefined;

  const visits = await db.select().from(bookings).where(eq(bookings.clientId, clientId))
    .orderBy(desc(bookings.bookingDate), desc(bookings.bookingTime));
  const visitIds = visits.map((visit) => visit.id);
  const completedVisits = visits.filter((visit) => visit.completedAt);
  const lastVisit = completedVisits[0] ?? null;
  const daysSinceLastVisit = lastVisit
    ? Math.max(0, Math.floor((Date.now() - new Date(`${lastVisit.bookingDate}T${lastVisit.bookingTime}:00`).getTime()) / 86_400_000))
    : null;
  const totalSpentAmd = completedVisits.reduce((total, visit) => total + (visit.finalPriceAmd ?? 0), 0);
  const serviceFrequency = completedVisits.reduce<Record<string, number>>((counts, visit) => {
    (visit.serviceSummary || visit.serviceName).split(" + ").forEach((service) => {
      counts[service] = (counts[service] || 0) + 1;
    });
    return counts;
  }, {});
  const popularServices = Object.entries(serviceFrequency)
    .sort(([, left], [, right]) => right - left)
    .map(([service]) => service)
    .slice(0, 3);

  const [events, media, reviewRequests, visitReviews, visitServices] = await Promise.all([
    visitIds.length ? db.select().from(bookingEvents).where(inArray(bookingEvents.bookingId, visitIds)).orderBy(desc(bookingEvents.createdAt)) : [],
    visitIds.length ? db.select().from(visitMedia).where(inArray(visitMedia.bookingId, visitIds)).orderBy(desc(visitMedia.createdAt)) : [],
    visitIds.length ? db.select().from(reviewRequestHistory).where(inArray(reviewRequestHistory.bookingId, visitIds)).orderBy(desc(reviewRequestHistory.sentAt)) : [],
    visitIds.length ? db.select().from(reviews).where(inArray(reviews.bookingId, visitIds)).orderBy(desc(reviews.createdAt)) : [],
    visitIds.length ? db.select().from(bookingServices).where(inArray(bookingServices.bookingId, visitIds)) : [],
  ]);
  const serviceIdsByBooking = new Map<number, number[]>();
  visitServices.forEach((service) => {
    const selected = serviceIdsByBooking.get(service.bookingId) ?? [];
    selected.push(service.serviceId);
    serviceIdsByBooking.set(service.bookingId, selected);
  });

  return {
    profile,
    visits: visits.map((visit) => ({ ...visit, serviceIds: serviceIdsByBooking.get(visit.id) ?? [] })),
    events,
    media,
    reviewRequests,
    reviews: visitReviews,
    metrics: {
      completedVisitCount: completedVisits.length,
      totalSpentAmd,
      averageCheckAmd: completedVisits.length ? Math.round(totalSpentAmd / completedVisits.length) : 0,
      popularServices,
      lastVisit,
      daysSinceLastVisit,
    },
  };
}
