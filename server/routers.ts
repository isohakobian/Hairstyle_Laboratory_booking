import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAllServices, getServiceById, createBookingWithServices, getBookingByReference, getBookingById,
  getBookingsByEmail, getAllBookings, updateBookingStatus, isTimeSlotAvailable,
  getBlockedDates, blockDate, unblockDate, createReview, getReviewByBookingId, createReviewToken,
  getReviewTokenByHash, markReviewTokenUsed,
  getPublishedReviews, getAllReviews, updateReviewPublished,
} from "./db";
import { TRPCError } from "@trpc/server";
import { sendBookingEmails, sendConfirmedBookingEmail, sendReviewRequestEmail } from "./bookingEmail";
import { createReviewTokenValue, getReviewTokenExpiry, hashReviewToken } from "./reviewToken";

// Admin middleware
const adminMiddleware = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
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

  services: router({
    list: publicProcedure.query(() => getAllServices()),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getServiceById(input.id)),
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

        // Check if date is blocked
        const blocked = await getBlockedDates();
        if (blocked.some(b => b.date === input.bookingDate)) {
          throw new TRPCError({ code: "CONFLICT", message: "This date is not available for booking" });
        }

        // Check if slot is available
        const available = await isTimeSlotAvailable(input.bookingDate, input.bookingTime, totalDurationMinutes);
        if (!available) {
          throw new TRPCError({ code: "CONFLICT", message: "This time slot is already booked" });
        }

        const referenceNumber = Math.random().toString(36).substring(2, 8).toUpperCase() +
          Date.now().toString(36).substring(0, 4).toUpperCase();

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
          comment: input.comment,
          status: "pending",
        }, services.map((service) => ({
          serviceId: service.id,
          serviceName: service.nameEn,
          durationMinutes: service.durationMinutes,
          priceSummary: formatServicePrice(service),
        })));

        const booking = await getBookingByReference(referenceNumber);

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

    getByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(({ input }) => getBookingsByEmail(input.email)),

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

    confirmBooking: adminMiddleware
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateBookingStatus(input.id, "confirmed");
        const booking = await getBookingById(input.id);
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
        return { success: true };
      }),

    requestReview: adminMiddleware
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const booking = await getBookingById(input.id);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        if (booking.status !== "confirmed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Reviews can only be requested for confirmed bookings" });
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
        return { success: true };
      }),

    // Schedule management
    blockedDates: adminMiddleware.query(() => getBlockedDates()),

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

    // Reviews management
    reviews: adminMiddleware.query(() => getAllReviews()),

    publishReview: adminMiddleware
      .input(z.object({ id: z.number(), publish: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateReviewPublished(input.id, input.publish ? "yes" : "no");
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
