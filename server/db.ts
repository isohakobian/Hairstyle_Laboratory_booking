import { and, asc, count, desc, eq, isNotNull, isNull, like, lt, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertBooking, InsertBookingService, users, services, bookings, bookingServices, reviewTokens, bookingStatusRecoveryTokens, bookingEvents, visitMedia, reviewRequestHistory, reviews, clients, emailTemplates } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Services queries
export async function getAllServices(includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(services).orderBy(asc(services.displayOrder), asc(services.id));
  return includeArchived ? query : query.where(eq(services.isActive, "yes"));
}

export async function getServiceById(id: number, includeArchived = false) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(services)
    .where(includeArchived ? eq(services.id, id) : and(eq(services.id, id), eq(services.isActive, "yes")))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export type ManagedServiceInput = {
  nameRu: string;
  nameEn: string;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  durationMinutes: number;
  priceAmd?: number | null;
  priceMinAmd?: number | null;
  priceMaxAmd?: number | null;
  depositAmd?: number | null;
  noteRu?: string | null;
  noteEn?: string | null;
  isActive: "yes" | "no";
  displayOrder: number;
};

export async function createManagedService(input: ManagedServiceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(services).values({
    ...input,
    priceRub: null,
    priceMinRub: null,
    priceMaxRub: null,
  });
  return Number(result[0].insertId);
}

export async function updateManagedService(id: number, input: ManagedServiceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(services).set({
    ...input,
    priceRub: null,
    priceMinRub: null,
    priceMaxRub: null,
  }).where(eq(services.id, id));
}

export async function setServiceActive(id: number, isActive: "yes" | "no") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(services).set({ isActive }).where(eq(services.id, id));
}

// Bookings queries
export async function createBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookings).values(booking);
  return result;
}

export type BookingServiceSelection = Omit<InsertBookingService, "id" | "bookingId" | "createdAt">;

export class BookingIntervalConflictError extends Error {
  constructor() {
    super("This time overlaps an existing booking");
    this.name = "BookingIntervalConflictError";
  }
}

function bookingIntervalsOverlap(startTime: string, durationMinutes: number, existingStartTime: string, existingDurationMinutes: number) {
  const requestedStart = toMinutes(startTime);
  const requestedEnd = requestedStart + durationMinutes;
  const existingStart = toMinutes(existingStartTime);
  const existingEnd = existingStart + existingDurationMinutes;
  return requestedStart < existingEnd && requestedEnd > existingStart;
}

export async function createBookingWithServices(booking: InsertBooking, selectedServices: BookingServiceSelection[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (selectedServices.length === 0) throw new Error("At least one service is required");
  if (!booking.totalDurationMinutes || booking.totalDurationMinutes <= 0) throw new Error("Booking duration is required");

  return db.transaction(async (tx) => {
    const sameDayBookings = await tx.select().from(bookings).where(and(
      eq(bookings.bookingDate, booking.bookingDate),
      or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
    )).for("update");
    const overlapsExisting = sameDayBookings.some((existing) => bookingIntervalsOverlap(
      booking.bookingTime,
      booking.totalDurationMinutes!,
      existing.bookingTime,
      existing.totalDurationMinutes || 30,
    ));
    if (overlapsExisting) throw new BookingIntervalConflictError();

    const result = await tx.insert(bookings).values(booking);
    const bookingId = Number(result[0].insertId);

    await tx.insert(bookingServices).values(selectedServices.map((service) => ({
      ...service,
      bookingId,
    })));

    return bookingId;
  });
}

export async function getBookingByReference(referenceNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.referenceNumber, referenceNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookingsByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).where(eq(bookings.clientEmail, email));
}

export async function createBookingStatusRecoveryToken(clientEmail: string, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(bookingStatusRecoveryTokens).values({ clientEmail, tokenHash, expiresAt });
}

export async function claimBookingStatusRecoveryToken(tokenHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const token = (await db.select().from(bookingStatusRecoveryTokens).where(eq(bookingStatusRecoveryTokens.tokenHash, tokenHash)).limit(1))[0];
  if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) return undefined;

  const update = await db.update(bookingStatusRecoveryTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(bookingStatusRecoveryTokens.id, token.id), isNull(bookingStatusRecoveryTokens.usedAt)));
  const affectedRows = Number(
    (update as { affectedRows?: number }).affectedRows
      ?? (update as unknown as [{ affectedRows?: number }])[0]?.affectedRows
      ?? 0,
  );
  return affectedRows === 1 ? token : undefined;
}

export async function getSafeBookingStatusesByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    referenceNumber: bookings.referenceNumber,
    serviceSummary: bookings.serviceSummary,
    serviceName: bookings.serviceName,
    bookingDate: bookings.bookingDate,
    bookingTime: bookings.bookingTime,
    status: bookings.status,
  }).from(bookings).where(eq(bookings.clientEmail, email)).orderBy(desc(bookings.bookingDate), desc(bookings.bookingTime));
}

export async function getAllBookings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).orderBy(desc(bookings.createdAt));
}

export type BookingPageInput = {
  page: number;
  pageSize: number;
  status?: "all" | "pending" | "confirmed" | "declined";
  search?: string;
  sort?: "appointmentAsc" | "appointmentDesc" | "newest" | "statusAsc";
};

export async function getBookingPage(input: BookingPageInput) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
  const page = Math.max(1, input.page);
  const pageSize = Math.min(Math.max(1, input.pageSize), 50);
  const normalizedSearch = input.search?.trim() ?? "";
  const conditions = [
    input.status && input.status !== "all" ? eq(bookings.status, input.status) : undefined,
    normalizedSearch ? or(
      like(bookings.clientName, `%${normalizedSearch}%`),
      like(bookings.clientPhone, `%${normalizedSearch}%`),
      like(bookings.clientEmail, `%${normalizedSearch}%`),
    ) : undefined,
  ].filter(Boolean);
  const where = conditions.length ? and(...conditions) : undefined;
  const ordering = input.sort === "newest" ? [desc(bookings.createdAt)]
    : input.sort === "statusAsc" ? [asc(bookings.status), asc(bookings.bookingDate), asc(bookings.bookingTime)]
    : input.sort === "appointmentDesc" ? [desc(bookings.bookingDate), desc(bookings.bookingTime)]
    : [asc(bookings.bookingDate), asc(bookings.bookingTime)];
  const [items, totalResult] = await Promise.all([
    db.select().from(bookings).where(where).orderBy(...ordering).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(bookings).where(where),
  ]);
  return { items, total: Number(totalResult[0]?.total ?? 0), page, pageSize };
}

export async function getClientDirectory() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: clients.id,
    name: clients.name,
    phone: clients.phone,
    email: clients.email,
    updatedAt: clients.updatedAt,
  }).from(clients).orderBy(desc(clients.updatedAt));
}

export async function deleteBookingAndRelatedData(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const booking = (await tx.select({ id: bookings.id, clientId: bookings.clientId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1))[0];
    if (!booking) return { deleted: false, deletedClientProfile: false };

    await tx.delete(reviews).where(eq(reviews.bookingId, bookingId));
    await tx.delete(reviewTokens).where(eq(reviewTokens.bookingId, bookingId));
    await tx.delete(reviewRequestHistory).where(eq(reviewRequestHistory.bookingId, bookingId));
    await tx.delete(bookingEvents).where(eq(bookingEvents.bookingId, bookingId));
    // The built-in storage layer intentionally exposes no physical-delete API.
    // Removing the stored keys and metadata makes private media unreachable.
    await tx.delete(visitMedia).where(eq(visitMedia.bookingId, bookingId));
    await tx.delete(bookingServices).where(eq(bookingServices.bookingId, bookingId));
    await tx.delete(bookings).where(eq(bookings.id, bookingId));

    let deletedClientProfile = false;
    if (booking.clientId) {
      const remainingBooking = (await tx.select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.clientId, booking.clientId))
        .limit(1))[0];
      if (!remainingBooking) {
        await tx.delete(clients).where(eq(clients.id, booking.clientId));
        deletedClientProfile = true;
      }
    }

    return { deleted: true, deletedClientProfile };
  });
}

export async function getBookingServices(bookingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookingServices).where(eq(bookingServices.bookingId, bookingId));
}

export async function updateBookingStatus(id: number, status: "pending" | "confirmed" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookings).set({ status }).where(eq(bookings.id, id));
}

export async function getRepeatFollowUpDueBookings(visitDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).where(and(
    eq(bookings.status, "confirmed"),
    lte(bookings.bookingDate, visitDate),
    isNull(bookings.repeatFollowUpSentAt),
  ));
}

export async function markRepeatFollowUpSent(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookings)
    .set({ repeatFollowUpSentAt: new Date() })
    .where(and(eq(bookings.id, bookingId), isNull(bookings.repeatFollowUpSentAt)));
}

export async function claimRepeatFollowUp(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const staleClaimBefore = new Date(Date.now() - 60 * 60 * 1000);
  return db.update(bookings)
    .set({ repeatFollowUpClaimedAt: new Date() })
    .where(and(
      eq(bookings.id, bookingId),
      isNull(bookings.repeatFollowUpSentAt),
      or(isNull(bookings.repeatFollowUpClaimedAt), lt(bookings.repeatFollowUpClaimedAt, staleClaimBefore)),
    ));
}

export async function releaseRepeatFollowUpClaim(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookings)
    .set({ repeatFollowUpClaimedAt: null })
    .where(and(eq(bookings.id, bookingId), isNull(bookings.repeatFollowUpSentAt)));
}

// Check for double booking on confirmed slots
function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function isTimeSlotAvailable(date: string, time: string, durationMinutes = 30, excludeBookingId?: number) {
  const db = await getDb();
  if (!db) return true;
  
  const query = db.select().from(bookings)
    .where(and(
      eq(bookings.bookingDate, date),
      or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
    ));
  
  const results = await query;
  return results
    .filter((booking) => booking.id !== excludeBookingId)
    .every((booking) => !bookingIntervalsOverlap(time, durationMinutes, booking.bookingTime, booking.totalDurationMinutes || 30));
}

// ── Blocked Dates ──────────────────────────────────────────────────────────
import { blockedDates, InsertBlockedDate, InsertReview } from "../drizzle/schema";

export async function getBlockedDates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blockedDates).orderBy(blockedDates.date);
}

export async function blockDate(date: string, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blockedDates).values({ date, reason }).onDuplicateKeyUpdate({ set: { reason } });
}

export async function unblockDate(date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(blockedDates).where(eq(blockedDates.date, date));
}

// ── Reviews ────────────────────────────────────────────────────────────────
export async function createReview(review: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(reviews).values(review);
}

export async function getReviewByBookingId(bookingId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPublishedReviews() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.isPublished, "yes")).orderBy(desc(reviews.createdAt));
}

export async function getAllReviews() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).orderBy(desc(reviews.createdAt));
}

export async function getReviewRequestDashboard() {
  const db = await getDb();
  if (!db) return { items: [], stats: { sent: 0, received: 0, awaiting: 0 } };

  const rows = await db.select({
    request: reviewRequestHistory,
    booking: bookings,
    review: reviews,
  }).from(reviewRequestHistory)
    .innerJoin(bookings, eq(reviewRequestHistory.bookingId, bookings.id))
    .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
    .orderBy(desc(reviewRequestHistory.sentAt));

  const items = rows.map(({ request, booking, review }) => ({
    id: request.id,
    bookingId: booking.id,
    referenceNumber: booking.referenceNumber,
    clientName: booking.clientName,
    recipientEmail: request.recipientEmail,
    sentAt: request.sentAt,
    status: review ? "received" as const : "awaiting" as const,
    reviewCreatedAt: review?.createdAt ?? null,
    rating: review?.rating ?? null,
  }));
  const received = items.filter((item) => item.status === "received").length;
  return { items, stats: { sent: items.length, received, awaiting: items.length - received } };
}

export type ReviewRequestPageInput = {
  page: number;
  pageSize: number;
  status?: "all" | "awaiting" | "received";
  sort?: "sentDesc" | "sentAsc" | "receivedDesc";
};

export async function getReviewRequestPage(input: ReviewRequestPageInput) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
  const page = Math.max(1, input.page);
  const pageSize = Math.min(Math.max(1, input.pageSize), 50);
  const statusCondition = input.status === "awaiting" ? isNull(reviews.id)
    : input.status === "received" ? isNotNull(reviews.id)
    : undefined;
  const ordering = input.sort === "sentAsc" ? [asc(reviewRequestHistory.sentAt)]
    : input.sort === "receivedDesc" ? [desc(reviews.createdAt), desc(reviewRequestHistory.sentAt)]
    : [desc(reviewRequestHistory.sentAt)];
  const [rows, totalResult] = await Promise.all([
    db.select({ request: reviewRequestHistory, booking: bookings, review: reviews })
      .from(reviewRequestHistory)
      .innerJoin(bookings, eq(reviewRequestHistory.bookingId, bookings.id))
      .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
      .where(statusCondition)
      .orderBy(...ordering)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() })
      .from(reviewRequestHistory)
      .innerJoin(bookings, eq(reviewRequestHistory.bookingId, bookings.id))
      .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
      .where(statusCondition),
  ]);
  const items = rows.map(({ request, booking, review }) => ({
    id: request.id,
    bookingId: booking.id,
    referenceNumber: booking.referenceNumber,
    clientName: booking.clientName,
    recipientEmail: request.recipientEmail,
    sentAt: request.sentAt,
    status: review ? "received" as const : "awaiting" as const,
    reviewCreatedAt: review?.createdAt ?? null,
    rating: review?.rating ?? null,
  }));
  return { items, total: Number(totalResult[0]?.total ?? 0), page, pageSize };
}

export async function getReviewRequestStats() {
  const db = await getDb();
  if (!db) return { sent: 0, received: 0, awaiting: 0 };
  const [sentResult, receivedResult] = await Promise.all([
    db.select({ total: count() }).from(reviewRequestHistory),
    db.select({ total: count() }).from(reviewRequestHistory)
      .innerJoin(reviews, eq(reviews.bookingId, reviewRequestHistory.bookingId)),
  ]);
  const sent = Number(sentResult[0]?.total ?? 0);
  const received = Number(receivedResult[0]?.total ?? 0);
  return { sent, received, awaiting: Math.max(0, sent - received) };
}

export const REVIEW_REQUEST_TEMPLATE_KEY = "review-request";

export type ReviewRequestEmailTemplateInput = {
  subjectRu: string;
  subjectEn: string;
  bodyRu: string;
  bodyEn: string;
};

export const defaultReviewRequestEmailTemplate: ReviewRequestEmailTemplateInput = {
  subjectRu: "Спасибо за визит — Isaac",
  subjectEn: "Thank you for your visit — Isaac",
  bodyRu: "Привет, {{clientName}}.\n\nСпасибо за доверие и за ваш визит. Если у вас найдётся минута, буду рад честному отзыву. Это правда помогает мне.\n\nОставить отзыв: {{reviewUrl}}\n\nЕщё раз спасибо,\nIsaac",
  bodyEn: "Hi, {{clientName}}.\n\nThank you for trusting me with your appointment. If you have a minute, I’d love your honest feedback. It really helps me.\n\nLeave your feedback: {{reviewUrl}}\n\nThank you again,\nIsaac",
};

export async function getReviewRequestEmailTemplate() {
  const db = await getDb();
  if (!db) return defaultReviewRequestEmailTemplate;
  const saved = (await db.select().from(emailTemplates)
    .where(eq(emailTemplates.key, REVIEW_REQUEST_TEMPLATE_KEY))
    .limit(1))[0];
  return saved ? {
    subjectRu: saved.subjectRu,
    subjectEn: saved.subjectEn,
    bodyRu: saved.bodyRu,
    bodyEn: saved.bodyEn,
  } : defaultReviewRequestEmailTemplate;
}

export async function saveReviewRequestEmailTemplate(input: ReviewRequestEmailTemplateInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(emailTemplates).values({ key: REVIEW_REQUEST_TEMPLATE_KEY, ...input }).onDuplicateKeyUpdate({ set: input });
  return getReviewRequestEmailTemplate();
}

export async function updateReviewPublished(id: number, isPublished: "yes" | "no") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(reviews).set({ isPublished }).where(eq(reviews.id, id));
}

// ── Secure review tokens ────────────────────────────────────────────────────
export async function createReviewToken(bookingId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // A newly issued email invalidates an older review link for the same visit.
  await db.delete(reviewTokens).where(eq(reviewTokens.bookingId, bookingId));
  await db.insert(reviewTokens).values({ bookingId, tokenHash, expiresAt });
}

export async function getReviewTokenByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reviewTokens).where(eq(reviewTokens.tokenHash, tokenHash)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markReviewTokenUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(reviewTokens).set({ usedAt: new Date() }).where(and(eq(reviewTokens.id, id), isNull(reviewTokens.usedAt)));
}
