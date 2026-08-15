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
  isActive: mysqlEnum("isActive", ["yes", "no"]).default("yes").notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
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
  finalPriceAmd: int("finalPriceAmd"),
  bookingDate: varchar("bookingDate", { length: 10 }).notNull(), // YYYY-MM-DD
  bookingTime: varchar("bookingTime", { length: 5 }).notNull(), // HH:MM
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 20 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientId: int("clientId"),
  completedAt: timestamp("completedAt"),
  comment: text("comment"),
  status: mysqlEnum("status", ["pending", "confirmed", "declined"]).default("pending").notNull(),
  manualDepositAmountAmd: int("manualDepositAmountAmd"),
  manualDepositStatus: mysqlEnum("manualDepositStatus", ["not_required", "awaiting_proof", "proof_received", "verified", "waived"]).default("not_required").notNull(),
  manualDepositConfirmedAt: timestamp("manualDepositConfirmedAt"),
  manualDepositReceiptKey: varchar("manualDepositReceiptKey", { length: 500 }),
  manualDepositReceiptFileName: varchar("manualDepositReceiptFileName", { length: 255 }),
  manualDepositReceiptMimeType: varchar("manualDepositReceiptMimeType", { length: 100 }),
  repeatFollowUpClaimedAt: timestamp("repeatFollowUpClaimedAt"),
  repeatFollowUpSentAt: timestamp("repeatFollowUpSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("bookings_clientId_idx").on(table.clientId),
  index("bookings_date_time_idx").on(table.bookingDate, table.bookingTime),
]);

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// Private client profiles turn the admin workspace into Isaac's working memory.
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  lookupKey: varchar("lookupKey", { length: 360 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  birthday: varchar("birthday", { length: 10 }),
  instagram: varchar("instagram", { length: 100 }),
  preferredHairLength: text("preferredHairLength"),
  preferredBeardShape: text("preferredBeardShape"),
  preferredStyling: text("preferredStyling"),
  dislikes: text("dislikes"),
  skinSensitivity: text("skinSensitivity"),
  stylistNotes: text("stylistNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// Exact working ranges opened by Isaac. A client only sees slots that fit
// completely inside a window and do not overlap an existing appointment.
export const availabilityWindows = mysqlTable("availabilityWindows", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  slotIntervalMinutes: int("slotIntervalMinutes").notNull().default(30),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("availabilityWindows_date_idx").on(table.date),
  uniqueIndex("availabilityWindows_date_range_idx").on(table.date, table.startTime, table.endTime),
]);

export type AvailabilityWindow = typeof availabilityWindows.$inferSelect;

// A move records both the original and new appointment so the client timeline
// stays accurate and the original details are never overwritten.
export const bookingEvents = mysqlTable("bookingEvents", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  eventType: mysqlEnum("eventType", ["created", "confirmed", "declined", "rescheduled", "completed", "note"]).notNull(),
  previousDate: varchar("previousDate", { length: 10 }),
  previousTime: varchar("previousTime", { length: 5 }),
  nextDate: varchar("nextDate", { length: 10 }),
  nextTime: varchar("nextTime", { length: 5 }),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("bookingEvents_bookingId_idx").on(table.bookingId),
]);

export type BookingEvent = typeof bookingEvents.$inferSelect;

// Private before/after photographs live in S3; only their metadata is stored here.
export const visitMedia = mysqlTable("visitMedia", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  mediaType: mysqlEnum("mediaType", ["before", "after"]).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  caption: text("caption"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("visitMedia_bookingId_idx").on(table.bookingId),
]);

export const reviewRequestHistory = mysqlTable("reviewRequestHistory", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
}, (table) => [
  index("reviewRequestHistory_bookingId_idx").on(table.bookingId),
]);

// Editorial notices are date-bound, bilingual, and appear in the public hero
// only while they are published and active.
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  titleRu: varchar("titleRu", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  bodyRu: text("bodyRu").notNull(),
  bodyEn: text("bodyEn").notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
  isPublished: mysqlEnum("isPublished", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("announcements_period_idx").on(table.startDate, table.endDate),
]);

// Project-level scheduled jobs keep their platform task IDs here for later
// inspection, pause, or deletion without relying on a sandbox session.
export const automationSettings = mysqlTable("automationSettings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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

// A recovery link is sent only to the email originally supplied with a booking.
// The plain token never reaches the database; it is SHA-256 hashed before storage.
export const bookingStatusRecoveryTokens = mysqlTable("bookingStatusRecoveryTokens", {
  id: int("id").autoincrement().primaryKey(),
  clientEmail: varchar("clientEmail", { length: 320 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("bookingStatusRecoveryTokens_email_idx").on(table.clientEmail),
]);

export type BookingStatusRecoveryToken = typeof bookingStatusRecoveryTokens.$inferSelect;
export type InsertBookingStatusRecoveryToken = typeof bookingStatusRecoveryTokens.$inferInsert;

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

// Admin-managed email copy. Template values support safe placeholder replacement
// immediately before a message is delivered to a client.
export const emailTemplates = mysqlTable("emailTemplates", {
  key: varchar("key", { length: 100 }).primaryKey(),
  subjectRu: varchar("subjectRu", { length: 255 }).notNull(),
  subjectEn: varchar("subjectEn", { length: 255 }).notNull(),
  bodyRu: text("bodyRu").notNull(),
  bodyEn: text("bodyEn").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

// A single owner-managed record controls the public manual-deposit instructions.
// The card/bank details are intentionally shown only after a booking is created;
// clients never enter card data on this website.
export const manualDepositSettings = mysqlTable("manualDepositSettings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  recipientName: varchar("recipientName", { length: 255 }).notNull().default(""),
  cardDetails: varchar("cardDetails", { length: 255 }).notNull().default(""),
  instagramUrl: varchar("instagramUrl", { length: 500 }).notNull().default(""),
  policyRu: text("policyRu").notNull(),
  policyEn: text("policyEn").notNull(),
  isEnabled: mysqlEnum("isEnabled", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManualDepositSettings = typeof manualDepositSettings.$inferSelect;
export type InsertManualDepositSettings = typeof manualDepositSettings.$inferInsert;
