import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  nameEn: varchar("nameEn", { length: 255 }).notNull(),
  nameRu: varchar("nameRu", { length: 255 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionRu: text("descriptionRu"),
  durationMinutes: int("durationMinutes").notNull(),
  priceRub: int("priceRub"),
  priceMinRub: int("priceMinRub"),
  priceMaxRub: int("priceMaxRub"),
  priceAmd: int("priceAmd"),
  priceMinAmd: int("priceMinAmd"),
  priceMaxAmd: int("priceMaxAmd"),
  depositAmd: int("depositAmd"),
  noteEn: text("noteEn"),
  noteRu: text("noteRu"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  referenceNumber: varchar("referenceNumber", { length: 12 }).notNull().unique(),
  serviceId: int("serviceId").notNull(),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  serviceSummary: varchar("serviceSummary", { length: 1000 }).notNull().default(""),
  totalDurationMinutes: int("totalDurationMinutes").notNull().default(0),
  totalPriceSummary: varchar("totalPriceSummary", { length: 255 }).notNull().default(""),
  bookingDate: varchar("bookingDate", { length: 10 }).notNull(), // YYYY-MM-DD
  bookingTime: varchar("bookingTime", { length: 5 }).notNull(), // HH:MM
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 20 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  comment: text("comment"),
  status: mysqlEnum("status", ["pending", "confirmed", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// Each row represents a distinct service selected for one booking. A unique
// index prevents clients from adding the same service twice to one visit.
export const bookingServices = mysqlTable("bookingServices", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  serviceId: int("serviceId").notNull(),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  priceSummary: varchar("priceSummary", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("bookingServices_bookingId_idx").on(table.bookingId),
  uniqueIndex("bookingServices_bookingId_serviceId_idx").on(table.bookingId, table.serviceId),
]);

export type BookingService = typeof bookingServices.$inferSelect;
export type InsertBookingService = typeof bookingServices.$inferInsert;

export const reviewTokens = mysqlTable("reviewTokens", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("reviewTokens_bookingId_idx").on(table.bookingId),
]);

export type ReviewToken = typeof reviewTokens.$inferSelect;
export type InsertReviewToken = typeof reviewTokens.$inferInsert;

// Schedule management: admin can block specific dates
export const blockedDates = mysqlTable("blockedDates", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = typeof blockedDates.$inferInsert;

// Reviews: submitted after booking is confirmed
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().unique(),
  referenceNumber: varchar("referenceNumber", { length: 12 }).notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  rating: int("rating").notNull(), // 1-5
  text: text("text"),
  isPublished: mysqlEnum("isPublished", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
