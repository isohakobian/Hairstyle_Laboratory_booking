import { and, desc, eq } from "drizzle-orm";
import { announcements } from "../drizzle/schema";
import { getDb } from "./db";

function yerevanDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yerevan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function getActiveAnnouncements(limit = 2) {
  const db = await getDb();
  if (!db) return [];
  const today = yerevanDate();
  const published = await db.select().from(announcements)
    .where(eq(announcements.isPublished, "yes"))
    .orderBy(desc(announcements.startDate));
  return published.filter(item => item.startDate <= today && item.endDate >= today).slice(0, limit);
}

export async function getActiveAnnouncement() {
  return (await getActiveAnnouncements(1))[0] ?? null;
}

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(desc(announcements.startDate), desc(announcements.createdAt));
}

export type AnnouncementInput = {
  titleRu: string;
  titleEn: string;
  bodyRu: string;
  bodyEn: string;
  startDate: string;
  endDate: string;
  isPublished: "yes" | "no";
};

export async function saveAnnouncement(input: AnnouncementInput & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (input.endDate < input.startDate) throw new Error("End date must not be before the start date");
  const { id, ...values } = input;
  if (id) {
    await db.update(announcements).set(values).where(eq(announcements.id, id));
    return id;
  }
  const result = await db.insert(announcements).values(values);
  return Number(result[0].insertId);
}

export async function setAnnouncementPublished(id: number, isPublished: "yes" | "no") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(announcements).set({ isPublished }).where(eq(announcements.id, id));
}
