import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, like, lt, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertBooking, InsertBookingService, users, services, bookings, bookingServices, reviewTokens, bookingStatusRecoveryTokens, bookingEvents, visitMedia, reviewRequestHistory, clientEmailDeliveries, reviews, clients, emailTemplates, availabilityWindows, manualDepositSettings, automationEmailDeliveries, bookingReminderDeliveries, bookingReminderSettings } from "../drizzle/schema";
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
  status?: "all" | "pending" | "confirmed" | "declined" | "cancelled";
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
  const bookingIds = items.map(item => item.id);
  const deliveryAttempts = bookingIds.length
    ? await db.select({ bookingId: clientEmailDeliveries.bookingId, deliveryStatus: clientEmailDeliveries.deliveryStatus }).from(clientEmailDeliveries).where(inArray(clientEmailDeliveries.bookingId, bookingIds)).orderBy(desc(clientEmailDeliveries.createdAt), desc(clientEmailDeliveries.id))
    : [];
  const latestDeliveryByBooking = new Map<number, string>();
  deliveryAttempts.forEach(item => { if (!latestDeliveryByBooking.has(item.bookingId)) latestDeliveryByBooking.set(item.bookingId, item.deliveryStatus); });
  const failedBookingIds = new Set(Array.from(latestDeliveryByBooking.entries()).filter(([, status]) => status === "failed").map(([bookingId]) => bookingId));
  return { items: items.map(item => ({ ...item, hasEmailDeliveryFailure: failedBookingIds.has(item.id) })), total: Number(totalResult[0]?.total ?? 0), page, pageSize };
}

export async function getBookingsWithUnresolvedEmailFailures(limit = 50) {
  const db = await getDb();
  if (!db) return { bookings: [], totalUnresolved: 0 };
  const attempts = await db.select({ bookingId: clientEmailDeliveries.bookingId, deliveryStatus: clientEmailDeliveries.deliveryStatus })
    .from(clientEmailDeliveries).orderBy(desc(clientEmailDeliveries.createdAt), desc(clientEmailDeliveries.id));
  const latestDeliveryByBooking = new Map<number, string>();
  attempts.forEach(item => { if (!latestDeliveryByBooking.has(item.bookingId)) latestDeliveryByBooking.set(item.bookingId, item.deliveryStatus); });
  const unresolvedBookingIds = Array.from(latestDeliveryByBooking.entries()).filter(([, status]) => status === "failed").map(([bookingId]) => bookingId);
  const bookingIds = unresolvedBookingIds.slice(0, limit);
  const matchingBookings = bookingIds.length ? await db.select().from(bookings).where(inArray(bookings.id, bookingIds)) : [];
  return { bookings: matchingBookings, totalUnresolved: unresolvedBookingIds.length };
}

export async function getUnresolvedEmailDeliveryErrors() {
  const db = await getDb();
  if (!db) return [];
  const attempts = await db.select().from(clientEmailDeliveries)
    .orderBy(desc(clientEmailDeliveries.createdAt), desc(clientEmailDeliveries.id));
  const latestAttemptByBooking = new Map<number, typeof attempts[number]>();
  attempts.forEach(attempt => {
    if (!latestAttemptByBooking.has(attempt.bookingId)) latestAttemptByBooking.set(attempt.bookingId, attempt);
  });
  const failedAttempts = Array.from(latestAttemptByBooking.values()).filter(attempt => attempt.deliveryStatus === "failed");
  if (!failedAttempts.length) return [];
  const bookingIds = failedAttempts.map(attempt => attempt.bookingId);
  const bookingRows = await db.select({
    id: bookings.id,
    referenceNumber: bookings.referenceNumber,
    clientName: bookings.clientName,
    clientEmail: bookings.clientEmail,
    bookingDate: bookings.bookingDate,
    bookingTime: bookings.bookingTime,
    serviceSummary: bookings.serviceSummary,
    serviceName: bookings.serviceName,
  }).from(bookings).where(inArray(bookings.id, bookingIds));
  const bookingById = new Map(bookingRows.map(booking => [booking.id, booking]));
  return failedAttempts.flatMap(attempt => {
    const booking = bookingById.get(attempt.bookingId);
    if (!booking) return [];
    return [{
      bookingId: booking.id,
      referenceNumber: booking.referenceNumber,
      clientName: booking.clientName,
      clientEmail: attempt.recipientEmail || booking.clientEmail,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      services: booking.serviceSummary || booking.serviceName,
      notificationType: attempt.notificationType,
      errorMessage: attempt.errorMessage,
      failedAt: attempt.createdAt,
    }];
  });
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
    await tx.delete(clientEmailDeliveries).where(eq(clientEmailDeliveries.bookingId, bookingId));
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

export type ClientEmailDeliveryStatus = "sent" | "failed" | "skipped";

export async function recordClientEmailDelivery(input: {
  bookingId: number;
  notificationType: string;
  recipientEmail: string;
  deliveryStatus: ClientEmailDeliveryStatus;
  errorMessage?: string | null;
  emailSubject?: string | null;
  emailText?: string | null;
  isManualResend?: "yes" | "no";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(clientEmailDeliveries).values({
    ...input,
    errorMessage: input.errorMessage ? input.errorMessage.slice(0, 1000) : null,
    emailSubject: input.emailSubject ? input.emailSubject.slice(0, 500) : null,
    emailText: input.emailText ?? null,
    isManualResend: input.isManualResend ?? "no",
  });
}

export async function getClientEmailDeliveryHistory(bookingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientEmailDeliveries)
    .where(eq(clientEmailDeliveries.bookingId, bookingId))
    .orderBy(desc(clientEmailDeliveries.createdAt), desc(clientEmailDeliveries.id));
}

export async function getLatestBookingRescheduleEvent(bookingId: number) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(bookingEvents)
    .where(and(eq(bookingEvents.bookingId, bookingId), eq(bookingEvents.eventType, "rescheduled")))
    .orderBy(desc(bookingEvents.createdAt), desc(bookingEvents.id))
    .limit(1))[0] ?? null;
}

export async function getBookingServices(bookingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookingServices).where(eq(bookingServices.bookingId, bookingId));
}

export async function updateBookingStatus(id: number, status: "pending" | "confirmed" | "declined" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookings).set({ status }).where(eq(bookings.id, id));
}

export async function cancelBookingByClient(input: { referenceNumber: string; clientEmail: string; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const booking = await getBookingByReference(input.referenceNumber);
  if (!booking || !booking.clientEmail || booking.clientEmail.trim().toLowerCase() !== input.clientEmail.trim().toLowerCase()) {
    return { cancelled: false, reason: "not_found" as const };
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return { cancelled: false, reason: "unavailable" as const };
  }
  await db.transaction(async (tx) => {
    await tx.update(bookings).set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: input.reason,
    }).where(eq(bookings.id, booking.id));
    await tx.insert(bookingEvents).values({ bookingId: booking.id, eventType: "cancelled", note: input.reason });
  });
  return { cancelled: true, bookingId: booking.id };
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

export async function getAppointmentReminderDueBookings(bookingDate: string, startTime: string, endTime: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).where(and(
    eq(bookings.status, "confirmed"),
    eq(bookings.bookingDate, bookingDate),
    gte(bookings.bookingTime, startTime),
    lt(bookings.bookingTime, endTime),
    isNull(bookings.appointmentReminderSentAt),
  ));
}

export async function claimAppointmentReminder(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const staleClaimBefore = new Date(Date.now() - 60 * 60 * 1000);
  return db.update(bookings).set({ appointmentReminderClaimedAt: new Date() }).where(and(
    eq(bookings.id, bookingId),
    isNull(bookings.appointmentReminderSentAt),
    or(isNull(bookings.appointmentReminderClaimedAt), lt(bookings.appointmentReminderClaimedAt, staleClaimBefore)),
  ));
}

export async function markAppointmentReminderSent(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookings).set({ appointmentReminderSentAt: new Date() })
    .where(and(eq(bookings.id, bookingId), isNull(bookings.appointmentReminderSentAt)));
}

export async function releaseAppointmentReminderClaim(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookings).set({ appointmentReminderClaimedAt: null })
    .where(and(eq(bookings.id, bookingId), isNull(bookings.appointmentReminderSentAt)));
}

export type WeeklyBookingSummary = {
  start: Date;
  end: Date;
  newBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  emailDeliveryErrors: number;
};

function resultCount(rows: Array<{ count: number }>) {
  return Number(rows[0]?.count ?? 0);
}

export async function getWeeklyBookingSummary(start: Date, end: Date): Promise<WeeklyBookingSummary> {
  const db = await getDb();
  if (!db) return { start, end, newBookings: 0, cancelledBookings: 0, pendingBookings: 0, confirmedBookings: 0, completedBookings: 0, emailDeliveryErrors: 0 };
  const [newRows, cancelledRows, pendingRows, confirmedRows, completedRows, deliveryAttempts] = await Promise.all([
    db.select({ count: count() }).from(bookings).where(and(gte(bookings.createdAt, start), lt(bookings.createdAt, end))),
    db.select({ count: count() }).from(bookings).where(and(gte(bookings.cancelledAt, start), lt(bookings.cancelledAt, end))),
    db.select({ count: count() }).from(bookings).where(eq(bookings.status, "pending")),
    db.select({ count: count() }).from(bookings).where(eq(bookings.status, "confirmed")),
    db.select({ count: count() }).from(bookings).where(and(gte(bookings.completedAt, start), lt(bookings.completedAt, end))),
    db.select({ bookingId: clientEmailDeliveries.bookingId, deliveryStatus: clientEmailDeliveries.deliveryStatus }).from(clientEmailDeliveries).orderBy(desc(clientEmailDeliveries.createdAt), desc(clientEmailDeliveries.id)),
  ]);
  const latestDeliveryByBooking = new Map<number, string>();
  deliveryAttempts.forEach(item => { if (!latestDeliveryByBooking.has(item.bookingId)) latestDeliveryByBooking.set(item.bookingId, item.deliveryStatus); });
  return {
    start,
    end,
    newBookings: resultCount(newRows),
    cancelledBookings: resultCount(cancelledRows),
    pendingBookings: resultCount(pendingRows),
    confirmedBookings: resultCount(confirmedRows),
    completedBookings: resultCount(completedRows),
    emailDeliveryErrors: Array.from(latestDeliveryByBooking.values()).filter(status => status === "failed").length,
  };
}

export async function claimAutomationEmailDelivery(deliveryKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const staleClaimBefore = new Date(now.getTime() - 60 * 60 * 1000);
  return db.insert(automationEmailDeliveries).values({ deliveryKey, claimedAt: now }).onDuplicateKeyUpdate({
    set: {
      claimedAt: sql`IF(${automationEmailDeliveries.sentAt} IS NULL AND (${automationEmailDeliveries.claimedAt} IS NULL OR ${automationEmailDeliveries.claimedAt} < ${staleClaimBefore}), VALUES(claimedAt), ${automationEmailDeliveries.claimedAt})`,
    },
  });
}

export async function markAutomationEmailDeliverySent(deliveryKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(automationEmailDeliveries).set({ sentAt: new Date() })
    .where(and(eq(automationEmailDeliveries.deliveryKey, deliveryKey), isNull(automationEmailDeliveries.sentAt)));
}

export async function releaseAutomationEmailDeliveryClaim(deliveryKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(automationEmailDeliveries).set({ claimedAt: null })
    .where(and(eq(automationEmailDeliveries.deliveryKey, deliveryKey), isNull(automationEmailDeliveries.sentAt)));
}

export type BookingReminderSettings = {
  firstOffsetMinutes: number;
  firstEnabled: "yes" | "no";
  secondOffsetMinutes: number;
  secondEnabled: "yes" | "no";
};

const defaultBookingReminderSettings: BookingReminderSettings = {
  firstOffsetMinutes: 1440,
  firstEnabled: "yes",
  secondOffsetMinutes: 120,
  secondEnabled: "yes",
};

export async function getBookingReminderSettings(): Promise<BookingReminderSettings> {
  const db = await getDb();
  if (!db) return defaultBookingReminderSettings;
  const settings = await db.select().from(bookingReminderSettings).where(eq(bookingReminderSettings.id, 1)).limit(1);
  return settings[0] ? {
    firstOffsetMinutes: settings[0].firstOffsetMinutes,
    firstEnabled: settings[0].firstEnabled,
    secondOffsetMinutes: settings[0].secondOffsetMinutes,
    secondEnabled: settings[0].secondEnabled,
  } : defaultBookingReminderSettings;
}

export async function saveBookingReminderSettings(input: BookingReminderSettings) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(bookingReminderSettings).values({ id: 1, ...input }).onDuplicateKeyUpdate({ set: input });
  return getBookingReminderSettings();
}

export async function getAdditionalReminderDueBookings(bookingDate: string, startTime: string, endTime: string, offsetMinutes: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ booking: bookings }).from(bookings)
    .leftJoin(bookingReminderDeliveries, and(
      eq(bookingReminderDeliveries.bookingId, bookings.id),
      eq(bookingReminderDeliveries.offsetMinutes, offsetMinutes),
    ))
    .where(and(
      eq(bookings.status, "confirmed"),
      eq(bookings.bookingDate, bookingDate),
      gte(bookings.bookingTime, startTime),
      lt(bookings.bookingTime, endTime),
      isNull(bookingReminderDeliveries.sentAt),
    ));
  return rows.map(row => row.booking);
}

export async function claimAdditionalReminder(bookingId: number, offsetMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const staleClaimBefore = new Date(now.getTime() - 60 * 60 * 1000);
  return db.insert(bookingReminderDeliveries).values({ bookingId, offsetMinutes, claimedAt: now }).onDuplicateKeyUpdate({
    set: {
      claimedAt: sql`IF(${bookingReminderDeliveries.sentAt} IS NULL AND (${bookingReminderDeliveries.claimedAt} IS NULL OR ${bookingReminderDeliveries.claimedAt} < ${staleClaimBefore}), VALUES(claimedAt), ${bookingReminderDeliveries.claimedAt})`,
    },
  });
}

export async function markAdditionalReminderSent(bookingId: number, offsetMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookingReminderDeliveries).set({ sentAt: new Date() }).where(and(
    eq(bookingReminderDeliveries.bookingId, bookingId),
    eq(bookingReminderDeliveries.offsetMinutes, offsetMinutes),
    isNull(bookingReminderDeliveries.sentAt),
  ));
}

export async function releaseAdditionalReminderClaim(bookingId: number, offsetMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookingReminderDeliveries).set({ claimedAt: null }).where(and(
    eq(bookingReminderDeliveries.bookingId, bookingId),
    eq(bookingReminderDeliveries.offsetMinutes, offsetMinutes),
    isNull(bookingReminderDeliveries.sentAt),
  ));
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

export const MANUAL_DEPOSIT_SETTINGS_KEY = "manual-deposit";

export type ManualDepositSettingsInput = {
  recipientName: string;
  cardDetails: string;
  instagramUrl: string;
  policyRu: string;
  policyEn: string;
  isEnabled: "yes" | "no";
};

export const defaultManualDepositSettings: ManualDepositSettingsInput = {
  recipientName: "",
  cardDetails: "",
  instagramUrl: "",
  policyRu: "Отмена или перенос возможны не позднее чем за 24 часа до визита. При отмене позднее чем за 24 часа или неявке предоплата не возвращается. При своевременной отмене предоплату можно перенести на новую дату по согласованию с Isaac.",
  policyEn: "Cancellation or rescheduling is available no later than 24 hours before the visit. For a late cancellation or no-show, the deposit is non-refundable. With timely notice, the deposit can be moved to a new date by agreement with Isaac.",
  isEnabled: "no",
};

export async function getManualDepositSettings() {
  const db = await getDb();
  if (!db) return defaultManualDepositSettings;
  const saved = (await db.select().from(manualDepositSettings)
    .where(eq(manualDepositSettings.key, MANUAL_DEPOSIT_SETTINGS_KEY))
    .limit(1))[0];
  return saved ? {
    recipientName: saved.recipientName,
    cardDetails: saved.cardDetails,
    instagramUrl: saved.instagramUrl,
    policyRu: saved.policyRu,
    policyEn: saved.policyEn,
    isEnabled: saved.isEnabled,
  } : defaultManualDepositSettings;
}

export async function saveManualDepositSettings(input: ManualDepositSettingsInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(manualDepositSettings).values({ key: MANUAL_DEPOSIT_SETTINGS_KEY, ...input }).onDuplicateKeyUpdate({ set: input });
  return getManualDepositSettings();
}

export async function updateManualDepositStatus(id: number, status: "awaiting_proof" | "proof_received" | "verified" | "waived") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookings).set({
    manualDepositStatus: status,
    manualDepositConfirmedAt: status === "verified" ? new Date() : null,
  }).where(eq(bookings.id, id));
  return getBookingById(id);
}

export async function declineBookingForInvalidReceipt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const booking = await getBookingById(id);
  if (!booking) return { declined: false };
  await db.transaction(async (tx) => {
    await tx.update(bookings).set({ status: "declined", manualDepositStatus: "waived" }).where(eq(bookings.id, id));
    await tx.insert(bookingEvents).values({ bookingId: id, eventType: "declined", note: "Payment receipt was marked invalid by the owner." });
  });
  return { declined: true };
}

export async function attachManualDepositReceipt(id: number, receipt: { storageKey: string; fileName: string; mimeType: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookings).set({
    manualDepositReceiptKey: receipt.storageKey,
    manualDepositReceiptFileName: receipt.fileName,
    manualDepositReceiptMimeType: receipt.mimeType,
    manualDepositStatus: "proof_received",
  }).where(eq(bookings.id, id));
  return getBookingById(id);
}

function getYerevanDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yerevan", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function minutesForTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timeForMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export async function getAdminTodaySummary() {
  const db = await getDb();
  const date = getYerevanDate();
  if (!db) return { date, bookings: [], pendingCount: 0, confirmedCount: 0, freeWindows: [] as Array<{ startTime: string; endTime: string }> };
  const [todayBookings, windows, blocked] = await Promise.all([
    db.select().from(bookings).where(eq(bookings.bookingDate, date)).orderBy(asc(bookings.bookingTime)),
    db.select().from(availabilityWindows).where(eq(availabilityWindows.date, date)).orderBy(asc(availabilityWindows.startTime)),
    db.select({ id: blockedDates.id }).from(blockedDates).where(eq(blockedDates.date, date)).limit(1),
  ]);
  const activeBookings = todayBookings.filter((booking) => booking.status === "pending" || booking.status === "confirmed");
  const freeWindows = (blocked.length > 0 ? [] : windows).flatMap((window) => {
    const windowStart = minutesForTime(window.startTime);
    const windowEnd = minutesForTime(window.endTime);
    const dayBookings = activeBookings
      .map((booking) => ({ start: minutesForTime(booking.bookingTime), end: minutesForTime(booking.bookingTime) + Math.max(booking.totalDurationMinutes || 0, 1) }))
      .filter((booking) => booking.end > windowStart && booking.start < windowEnd)
      .sort((left, right) => left.start - right.start);
    let cursor = windowStart;
    const gaps: Array<{ startTime: string; endTime: string }> = [];
    dayBookings.forEach((booking) => {
      const start = Math.max(windowStart, booking.start);
      if (start > cursor) gaps.push({ startTime: timeForMinutes(cursor), endTime: timeForMinutes(start) });
      cursor = Math.max(cursor, Math.min(windowEnd, booking.end));
    });
    if (cursor < windowEnd) gaps.push({ startTime: timeForMinutes(cursor), endTime: timeForMinutes(windowEnd) });
    return gaps;
  });
  return {
    date,
    bookings: activeBookings,
    pendingCount: activeBookings.filter((booking) => booking.status === "pending").length,
    confirmedCount: activeBookings.filter((booking) => booking.status === "confirmed").length,
    freeWindows,
  };
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
