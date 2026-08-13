import { and, asc, eq, inArray, or } from "drizzle-orm";
import { availabilityWindows, blockedDates, bookings } from "../drizzle/schema";
import { getDb } from "./db";

const MINUTES_IN_HOUR = 60;

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_IN_HOUR + minutes;
}

function toTime(minutes: number) {
  return `${String(Math.floor(minutes / MINUTES_IN_HOUR)).padStart(2, "0")}:${String(minutes % MINUTES_IN_HOUR).padStart(2, "0")}`;
}

export async function getAvailabilityWindows() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(availabilityWindows).orderBy(asc(availabilityWindows.date), asc(availabilityWindows.startTime));
}

export async function getPublicAvailableDates() {
  const [windows, blocked] = await Promise.all([getAvailabilityWindows(), getBlockedDates()]);
  const blockedSet = new Set(blocked.map((entry) => entry.date));
  const today = new Date().toISOString().slice(0, 10);
  return Array.from(new Set(windows.map((window) => window.date)))
    .filter((date) => date >= today && !blockedSet.has(date))
    .sort();
}

export async function getAvailableSlots(date: string, durationMinutes: number, excludeBookingId?: number) {
  const db = await getDb();
  if (!db || durationMinutes <= 0) return [];

  const [blocked, windows, activeBookings] = await Promise.all([
    db.select().from(blockedDates).where(eq(blockedDates.date, date)).limit(1),
    db.select().from(availabilityWindows).where(eq(availabilityWindows.date, date)).orderBy(asc(availabilityWindows.startTime)),
    db.select().from(bookings).where(and(
      eq(bookings.bookingDate, date),
      or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
    )),
  ]);
  if (blocked.length > 0) return [];

  const candidateSlots = new Set<string>();
  for (const window of windows) {
    const start = toMinutes(window.startTime);
    const end = toMinutes(window.endTime);
    for (let candidate = start; candidate + durationMinutes <= end; candidate += window.slotIntervalMinutes) {
      candidateSlots.add(toTime(candidate));
    }
  }

  return Array.from(candidateSlots).sort().filter((time) => {
    const candidateStart = toMinutes(time);
    const candidateEnd = candidateStart + durationMinutes;
    return activeBookings
      .filter((booking) => booking.id !== excludeBookingId)
      .every((booking) => {
        const bookingStart = toMinutes(booking.bookingTime);
        const bookingEnd = bookingStart + (booking.totalDurationMinutes || 30);
        return candidateEnd <= bookingStart || candidateStart >= bookingEnd;
      });
  });
}

export async function setAvailabilityForDates(
  dates: string[],
  startTime: string,
  endTime: string,
  slotIntervalMinutes = 30,
) {
  const uniqueDates = Array.from(new Set(dates));
  if (uniqueDates.length === 0) throw new Error("Select at least one date");
  if (toMinutes(endTime) <= toMinutes(startTime)) throw new Error("End time must be after start time");
  if (slotIntervalMinutes <= 0 || slotIntervalMinutes > 120) throw new Error("Slot interval must be between 1 and 120 minutes");

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    await tx.delete(availabilityWindows).where(inArray(availabilityWindows.date, uniqueDates));
    await tx.delete(blockedDates).where(inArray(blockedDates.date, uniqueDates));
    await tx.insert(availabilityWindows).values(uniqueDates.map((date) => ({
      date,
      startTime,
      endTime,
      slotIntervalMinutes,
    })));
  });
}

export async function blockDates(dates: string[], reason?: string) {
  const uniqueDates = Array.from(new Set(dates));
  if (uniqueDates.length === 0) throw new Error("Select at least one date");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    await tx.delete(availabilityWindows).where(inArray(availabilityWindows.date, uniqueDates));
    for (const date of uniqueDates) {
      await tx.insert(blockedDates).values({ date, reason: reason || null })
        .onDuplicateKeyUpdate({ set: { reason: reason || null } });
    }
  });
}

export async function getBlockedDates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blockedDates).orderBy(asc(blockedDates.date));
}
