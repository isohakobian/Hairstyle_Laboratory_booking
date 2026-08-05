import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertBooking, users, services, bookings } from "../drizzle/schema";
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
export async function getAllServices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(services).orderBy(services.id);
}

export async function getServiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Bookings queries
export async function createBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookings).values(booking);
  return result;
}

export async function getBookingByReference(referenceNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.referenceNumber, referenceNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookingsByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).where(eq(bookings.clientEmail, email));
}

export async function getAllBookings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).orderBy(desc(bookings.createdAt));
}

export async function updateBookingStatus(id: number, status: "pending" | "confirmed" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bookings).set({ status }).where(eq(bookings.id, id));
}

// Check for double booking on confirmed slots
export async function isTimeSlotAvailable(date: string, time: string, excludeBookingId?: number) {
  const db = await getDb();
  if (!db) return true;
  
  const query = db.select().from(bookings)
    .where(and(
      eq(bookings.bookingDate, date),
      eq(bookings.bookingTime, time),
      eq(bookings.status, "confirmed")
    ));
  
  const results = await query;
  return results.length === 0;
}

// ── Blocked Dates ──────────────────────────────────────────────────────────
import { blockedDates, reviews, InsertBlockedDate, InsertReview } from "../drizzle/schema";

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

export async function updateReviewPublished(id: number, isPublished: "yes" | "no") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(reviews).set({ isPublished }).where(eq(reviews.id, id));
}
