import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAllServices, getServiceById, createBookingWithServices, getBookingByReference, getBookingById, BookingIntervalConflictError,
  getBookingsByEmail, getAllBookings, updateBookingStatus, isTimeSlotAvailable,
  getBlockedDates, blockDate, unblockDate, createReview, getReviewByBookingId, createReviewToken,
  getReviewTokenByHash, markReviewTokenUsed,
  getPublishedReviews, getAllReviews, updateReviewPublished, createManagedService, setServiceActive, updateManagedService,
  createBookingStatusRecoveryToken, claimBookingStatusRecoveryToken, getSafeBookingStatusesByEmail,
  deleteBookingAndRelatedData, getClientDirectory, getReviewRequestDashboard, getReviewRequestEmailTemplate, saveReviewRequestEmailTemplate,
} from "./db";
import { TRPCError } from "@trpc/server";
import { sendBookingEmails, sendBookingStatusRecoveryEmail, sendConfirmedBookingEmail, sendReviewRequestEmail } from "./bookingEmail";
import { createReviewTokenValue, getBookingStatusRecoveryExpiry, getReviewTokenExpiry, hashReviewToken } from "./reviewToken";
import { blockDates, getAvailabilityWindows, getAvailableSlots, getPublicAvailableDates, setAvailabilityForDates } from "./availability";
import { completeBooking, createBookingEvent, findOrCreateClient, getClientMemory, getSignedVisitMediaUrl, recordReviewRequest, rescheduleBooking, updateClientProfile, uploadVisitMedia } from "./clientMemory";
import { getActiveAnnouncements, getAllAnnouncements, saveAnnouncement, setAnnouncementPublished } from "./announcements";

// Admin middleware
const adminMiddleware = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const managedServiceInput = z.object({
  id: z.number().int().positive().optional(),
  nameRu: z.string().trim().min(1).max(255),
  nameEn: z.string().trim().min(1).max(255),
  descriptionRu: z.string().trim().max(3000).nullable().optional(),
  descriptionEn: z.string().trim().max(3000).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(720),
  priceAmd: z.number().int().min(0).nullable().optional(),
  priceMinAmd: z.number().int().min(0).nullable().optional(),
  priceMaxAmd: z.number().int().min(0).nullable().optional(),
  depositAmd: z.number().int().min(0).nullable().optional(),
  noteRu: z.string().trim().max(1000).nullable().optional(),
  noteEn: z.string().trim().max(1000).nullable().optional(),
  isActive: z.enum(["yes", "no"]),
  displayOrder: z.number().int().min(0).max(999),
}).superRefine((input, ctx) => {
  const hasMin = input.priceMinAmd !== null && input.priceMinAmd !== undefined;
  const hasMax = input.priceMaxAmd !== null && input.priceMaxAmd !== undefined;
  if (hasMin !== hasMax) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["priceMinAmd"], message: "Enter both minimum and maximum price" });
  }
  if (hasMin && hasMax && input.priceMinAmd! > input.priceMaxAmd!) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["priceMaxAmd"], message: "The maximum price must be at least the minimum price" });
  }
  if (input.priceAmd !== null && input.priceAmd !== undefined && hasMin) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["priceAmd"], message: "Choose either a fixed price or a price range" });
  }
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  announcements: router({
    active: publicProcedure.query(() => getActiveAnnouncements(2)),
  }),

  services: router({
    list: publicProcedure.query(() => getAllServices()),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getServiceById(input.id)),
  }),

  availability: router({
    dates: publicProcedure.query(() => getPublicAvailableDates()),
    slots: publicProcedure
      .input(z.object({ date: z.string(), durationMinutes: z.number().int().positive() }))
      .query(({ input }) => getAvailableSlots(input.date, input.durationMinutes)),
  }),

  bookings: router({
    create: publicProcedure
      .input(z.object({
        serviceIds: z.array(z.number().int().positive()).min(1).max(3),
        bookingDate: z.string(),
        bookingTime: z.string(),
        clientName: z.string(),
        clientPhone: z.string(),
        clientEmail: z.string().email().optional(),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        instagram: z.string().max(100).optional(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const uniqueServiceIds = Array.from(new Set(input.serviceIds));
        if (uniqueServiceIds.length !== input.serviceIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Each service can only be selected once" });
        }

        const selectedServices = await Promise.all(uniqueServiceIds.map((id) => getServiceById(id)));
        if (selectedServices.some((service) => !service)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected services are unavailable" });
        }

        const services = selectedServices.filter((service): service is NonNullable<typeof service> => Boolean(service));
        const totalDurationMinutes = services.reduce((total, service) => total + service.durationMinutes, 0);
        const serviceSummary = services.map((service) => service.nameEn).join(" + ");
        const fixedTotalAmd = services.reduce((total, service) => total + (service.priceAmd ?? 0), 0);
        const rangedServices = services.filter((service) => service.priceMinAmd !== null && service.priceMaxAmd !== null);
        const depositTotalAmd = services.reduce((total, service) => total + (service.depositAmd ?? 0), 0);
        const formatServicePrice = (service: typeof services[number]) => {
          if (service.priceAmd !== null) return `${service.priceAmd.toLocaleString()} ֏`;
          if (service.priceMinAmd !== null && service.priceMaxAmd !== null) {
            const deposit = service.depositAmd ? ` · deposit ${service.depositAmd.toLocaleString()} ֏` : "";
            return `${service.priceMinAmd.toLocaleString()} – ${service.priceMaxAmd.toLocaleString()} ֏${deposit}`;
          }
          return service.noteEn || service.noteRu || "Price on request";
        };
        const totalPriceSummary = rangedServices.length > 0
          ? `${(fixedTotalAmd + rangedServices.reduce((total, service) => total + (service.priceMinAmd ?? 0), 0)).toLocaleString()} – ${(fixedTotalAmd + rangedServices.reduce((total, service) => total + (service.priceMaxAmd ?? 0), 0)).toLocaleString()} ֏${depositTotalAmd ? ` · deposit ${depositTotalAmd.toLocaleString()} ֏` : ""}`
          : `${fixedTotalAmd.toLocaleString()} ֏`;

        const availableSlots = await getAvailableSlots(input.bookingDate, totalDurationMinutes);
        if (!availableSlots.includes(input.bookingTime)) {
          throw new TRPCError({ code: "CONFLICT", message: "This date or time slot is not available" });
        }

        const referenceNumber = Math.random().toString(36).substring(2, 8).toUpperCase() +
          Date.now().toString(36).substring(0, 4).toUpperCase();
        const client = await findOrCreateClient({
          name: input.clientName.trim(),
          phone: input.clientPhone.trim(),
          email: input.clientEmail,
          birthday: input.birthday,
          instagram: input.instagram?.trim().replace(/^@/, "") || undefined,
        });

        try {
          await createBookingWithServices({
            referenceNumber,
            // Kept as legacy fields so existing admin views and bookings remain compatible.
            serviceId: services[0].id,
            serviceName: serviceSummary,
            serviceSummary,
            totalDurationMinutes,
            totalPriceSummary,
            bookingDate: input.bookingDate,
            bookingTime: input.bookingTime,
            clientName: input.clientName,
            clientPhone: input.clientPhone,
            clientEmail: input.clientEmail,
            clientId: client.id,
            comment: input.comment,
            status: "pending",
          }, services.map((service) => ({
            serviceId: service.id,
            serviceName: service.nameEn,
            durationMinutes: service.durationMinutes,
            priceSummary: formatServicePrice(service),
          })));
        } catch (error) {
          if (error instanceof BookingIntervalConflictError) {
            throw new TRPCError({ code: "CONFLICT", message: "This date or time slot is no longer available" });
          }
          throw error;
        }

        const booking = await getBookingByReference(referenceNumber);
        if (booking) {
          await createBookingEvent({
            bookingId: booking.id,
            eventType: "created",
            nextDate: booking.bookingDate,
            nextTime: booking.bookingTime,
          });
        }

        try {
          await sendBookingEmails({
            referenceNumber,
            serviceName: serviceSummary,
            totalDurationMinutes,
            totalPriceSummary,
            bookingDate: input.bookingDate,
            bookingTime: input.bookingTime,
            clientName: input.clientName,
            clientPhone: input.clientPhone,
            clientEmail: input.clientEmail,
            comment: input.comment,
          });
        } catch (e) {
          // Email delivery must never block a successfully created booking.
          console.warn('[Booking] Failed to send Gmail booking emails:', e);
        }

        return booking;
      }),

    getByReference: publicProcedure
      .input(z.object({ referenceNumber: z.string() }))
      .query(({ input }) => getBookingByReference(input.referenceNumber)),

    requestStatusRecovery: publicProcedure
      .input(z.object({ clientEmail: z.string().trim().email() }))
      .mutation(async ({ input }) => {
        const clientEmail = input.clientEmail.toLowerCase();
        const existingBookings = await getBookingsByEmail(clientEmail);
        if (existingBookings.length > 0) {
          const token = createReviewTokenValue();
          await createBookingStatusRecoveryToken(clientEmail, hashReviewToken(token), getBookingStatusRecoveryExpiry());
          const recoveryUrl = `https://isaacbarber-axczkyb2.manus.space/status?recovery=${encodeURIComponent(token)}`;
          try {
            await sendBookingStatusRecoveryEmail(clientEmail, recoveryUrl);
          } catch (error) {
            console.error("[Booking recovery] Failed to send recovery email:", error);
          }
        }
        // A generic response avoids confirming whether a specific email has bookings.
        return { success: true };
      }),

    recoverStatus: publicProcedure
      .input(z.object({ token: z.string().min(32).max(255) }))
      .mutation(async ({ input }) => {
        const recoveryToken = await claimBookingStatusRecoveryToken(hashReviewToken(input.token));
        if (!recoveryToken) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This recovery link is invalid, expired, or already used" });
        }
        return getSafeBookingStatusesByEmail(recoveryToken.clientEmail);
      }),

    // Public: get blocked dates so booking form can disable them
    blockedDates: publicProcedure.query(() => getBlockedDates()),
  }),

  reviews: router({
    // Public: submit a review after booking confirmed
    submit: publicProcedure
      .input(z.object({
        token: z.string().min(32),
        rating: z.number().min(1).max(5),
        text: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        const reviewToken = await getReviewTokenByHash(hashReviewToken(input.token));
        if (!reviewToken || reviewToken.usedAt || reviewToken.expiresAt.getTime() < Date.now()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This review link is invalid or has expired" });
        }

        const booking = await getBookingById(reviewToken.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        if (booking.status !== "confirmed") throw new TRPCError({ code: "FORBIDDEN", message: "Only confirmed bookings can be reviewed" });

        const existing = await getReviewByBookingId(booking.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Review already submitted" });

        const tokenUpdate = await markReviewTokenUsed(reviewToken.id);
        const affectedRows = Number((tokenUpdate as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
        if (affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: "This review link has already been used" });

        await createReview({
          bookingId: booking.id,
          referenceNumber: booking.referenceNumber,
          clientName: booking.clientName,
          rating: input.rating,
          text: input.text,
          isPublished: "no",
        });
        return { success: true };
      }),

    // Public: get published reviews for homepage
    published: publicProcedure.query(() => getPublishedReviews()),

    // Check if review exists for a booking
    getByReference: publicProcedure
      .input(z.object({ referenceNumber: z.string() }))
      .query(async ({ input }) => {
        const booking = await getBookingByReference(input.referenceNumber);
        if (!booking) return null;
        return getReviewByBookingId(booking.id);
      }),
  }),

  admin: router({
    bookings: adminMiddleware.query(() => getAllBookings()),
    announcements: adminMiddleware.query(() => getAllAnnouncements()),
    services: adminMiddleware.query(() => getAllServices(true)),

    saveService: adminMiddleware
      .input(managedServiceInput)
      .mutation(async ({ input }) => {
        const { id, ...service } = input;
        const normalized = {
          ...service,
          descriptionRu: service.descriptionRu || null,
          descriptionEn: service.descriptionEn || null,
          priceAmd: service.priceAmd ?? null,
          priceMinAmd: service.priceMinAmd ?? null,
          priceMaxAmd: service.priceMaxAmd ?? null,
          depositAmd: service.depositAmd ?? null,
          noteRu: service.noteRu || null,
          noteEn: service.noteEn || null,
        };
        if (id) {
          await updateManagedService(id, normalized);
          return { id };
        }
        return { id: await createManagedService(normalized) };
      }),

    setServiceActive: adminMiddleware
      .input(z.object({ id: z.number().int().positive(), isActive: z.enum(["yes", "no"]) }))
      .mutation(({ input }) => setServiceActive(input.id, input.isActive)),

    saveAnnouncement: adminMiddleware
      .input(z.object({
        id: z.number().int().positive().optional(),
        titleRu: z.string().min(1).max(255),
        titleEn: z.string().min(1).max(255),
        bodyRu: z.string().min(1).max(5000),
        bodyEn: z.string().min(1).max(5000),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        isPublished: z.enum(["yes", "no"]),
      }))
      .mutation(({ input }) => saveAnnouncement(input)),

    setAnnouncementPublished: adminMiddleware
      .input(z.object({ id: z.number().int().positive(), isPublished: z.enum(["yes", "no"]) }))
      .mutation(({ input }) => setAnnouncementPublished(input.id, input.isPublished)),

    confirmBooking: adminMiddleware
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateBookingStatus(input.id, "confirmed");
        const booking = await getBookingById(input.id);
        if (booking) await createBookingEvent({ bookingId: booking.id, eventType: "confirmed" });
        if (booking?.clientEmail) {
          try {
            await sendConfirmedBookingEmail({
              referenceNumber: booking.referenceNumber,
              serviceName: booking.serviceSummary || booking.serviceName,
              totalDurationMinutes: booking.totalDurationMinutes || undefined,
              totalPriceSummary: booking.totalPriceSummary || undefined,
              bookingDate: booking.bookingDate,
              bookingTime: booking.bookingTime,
              clientName: booking.clientName,
              clientPhone: booking.clientPhone,
              clientEmail: booking.clientEmail,
              comment: booking.comment,
            });
          } catch (error) {
            console.warn("[Booking] Failed to send confirmation email:", error);
          }
        }
        return { success: true };
      }),

    declineBooking: adminMiddleware
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateBookingStatus(input.id, "declined");
        await createBookingEvent({ bookingId: input.id, eventType: "declined" });
        return { success: true };
      }),

    deleteBooking: adminMiddleware
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const result = await deleteBookingAndRelatedData(input.id);
        if (!result.deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        return { success: true, deletedClientProfile: result.deletedClientProfile };
      }),

    requestReview: adminMiddleware
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const booking = await getBookingById(input.id);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        if (booking.status !== "confirmed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Reviews can only be requested for confirmed bookings" });
        }
        if (!booking.completedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Reviews can only be requested after the visit is completed" });
        }
        if (!booking.clientEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This booking does not have a client email" });
        }

        const reviewToken = createReviewTokenValue();
        await createReviewToken(booking.id, hashReviewToken(reviewToken), getReviewTokenExpiry());
        const reviewUrl = `https://isaacbarber-axczkyb2.manus.space/review?token=${encodeURIComponent(reviewToken)}`;
        await sendReviewRequestEmail({
          referenceNumber: booking.referenceNumber,
          serviceName: booking.serviceSummary || booking.serviceName,
          totalDurationMinutes: booking.totalDurationMinutes || undefined,
          totalPriceSummary: booking.totalPriceSummary || undefined,
          bookingDate: booking.bookingDate,
          bookingTime: booking.bookingTime,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          clientEmail: booking.clientEmail,
          comment: booking.comment,
        }, reviewUrl);
        await recordReviewRequest(booking.id, booking.clientEmail);
        return { success: true };
      }),

    // Schedule management
    blockedDates: adminMiddleware.query(() => getBlockedDates()),
    availabilityWindows: adminMiddleware.query(() => getAvailabilityWindows()),

    setAvailability: adminMiddleware
      .input(z.object({
        dates: z.array(z.string()).min(1).max(62),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        slotIntervalMinutes: z.number().int().min(15).max(60).default(30),
      }))
      .mutation(async ({ input }) => {
        await setAvailabilityForDates(input.dates, input.startTime, input.endTime, input.slotIntervalMinutes);
        return { success: true };
      }),

    blockDates: adminMiddleware
      .input(z.object({ dates: z.array(z.string()).min(1).max(62), reason: z.string().max(255).optional() }))
      .mutation(async ({ input }) => {
        await blockDates(input.dates, input.reason);
        return { success: true };
      }),

    blockDate: adminMiddleware
      .input(z.object({ date: z.string(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        await blockDate(input.date, input.reason);
        return { success: true };
      }),

    unblockDate: adminMiddleware
      .input(z.object({ date: z.string() }))
      .mutation(async ({ input }) => {
        await unblockDate(input.date);
        return { success: true };
      }),

    rescheduleBooking: adminMiddleware
      .input(z.object({
        id: z.number().int().positive(),
        bookingDate: z.string(),
        bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
        note: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        await rescheduleBooking(input.id, input.bookingDate, input.bookingTime, input.note);
        return { success: true };
      }),

    completeBooking: adminMiddleware
      .input(z.object({ id: z.number().int().positive(), finalPriceAmd: z.number().int().nonnegative().optional(), note: z.string().max(1000).optional() }))
      .mutation(async ({ input }) => {
        await completeBooking(input.id, input.finalPriceAmd, input.note);
        return { success: true };
      }),

    clientMemory: adminMiddleware
      .input(z.object({ clientId: z.number().int().positive() }))
      .query(({ input }) => getClientMemory(input.clientId)),

    clientDirectory: adminMiddleware.query(() => getClientDirectory()),

    updateClientMemory: adminMiddleware
      .input(z.object({
        clientId: z.number().int().positive(),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        instagram: z.string().max(100).nullable().optional(),
        preferredHairLength: z.string().max(2000).nullable().optional(),
        preferredBeardShape: z.string().max(2000).nullable().optional(),
        preferredStyling: z.string().max(2000).nullable().optional(),
        dislikes: z.string().max(2000).nullable().optional(),
        skinSensitivity: z.string().max(2000).nullable().optional(),
        stylistNotes: z.string().max(5000).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { clientId, ...changes } = input;
        await updateClientProfile(clientId, changes);
        return { success: true };
      }),

    uploadVisitMedia: adminMiddleware
      .input(z.object({
        bookingId: z.number().int().positive(),
        mediaType: z.enum(["before", "after"]),
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        base64Data: z.string().min(1),
        caption: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => uploadVisitMedia(input)),

    visitMediaUrl: adminMiddleware
      .input(z.object({ storageKey: z.string().min(1).max(500) }))
      .query(({ input }) => getSignedVisitMediaUrl(input.storageKey)),

    // Reviews management
    reviews: adminMiddleware.query(() => getAllReviews()),
    reviewRequests: adminMiddleware.query(() => getReviewRequestDashboard()),
    reviewRequestTemplate: adminMiddleware.query(() => getReviewRequestEmailTemplate()),

    saveReviewRequestTemplate: adminMiddleware
      .input(z.object({
        subjectRu: z.string().trim().min(1).max(255),
        subjectEn: z.string().trim().min(1).max(255),
        bodyRu: z.string().trim().min(1).max(6000),
        bodyEn: z.string().trim().min(1).max(6000),
      }))
      .mutation(({ input }) => saveReviewRequestEmailTemplate(input)),

    publishReview: adminMiddleware
      .input(z.object({ id: z.number(), publish: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateReviewPublished(input.id, input.publish ? "yes" : "no");
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
