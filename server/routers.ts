import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAllServices, getServiceById, createBooking, getBookingByReference,
  getBookingsByEmail, getAllBookings, updateBookingStatus, isTimeSlotAvailable,
  getBlockedDates, blockDate, unblockDate, createReview, getReviewByBookingId,
  getPublishedReviews, getAllReviews, updateReviewPublished,
} from "./db";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { sendBookingEmails } from "./bookingEmail";

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
        serviceId: z.number(),
        serviceName: z.string(),
        bookingDate: z.string(),
        bookingTime: z.string(),
        clientName: z.string(),
        clientPhone: z.string(),
        clientEmail: z.string().email().optional(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if date is blocked
        const blocked = await getBlockedDates();
        if (blocked.some(b => b.date === input.bookingDate)) {
          throw new TRPCError({ code: "CONFLICT", message: "This date is not available for booking" });
        }

        // Check if slot is available
        const available = await isTimeSlotAvailable(input.bookingDate, input.bookingTime);
        if (!available) {
          throw new TRPCError({ code: "CONFLICT", message: "This time slot is already booked" });
        }

        const referenceNumber = Math.random().toString(36).substring(2, 8).toUpperCase() +
          Date.now().toString(36).substring(0, 4).toUpperCase();

        await createBooking({
          referenceNumber,
          serviceId: input.serviceId,
          serviceName: input.serviceName,
          bookingDate: input.bookingDate,
          bookingTime: input.bookingTime,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail,
          comment: input.comment,
          status: "pending",
        });

        const booking = await getBookingByReference(referenceNumber);

        // Send email notification to owner
        try {
          await notifyOwner({
            title: `📋 Новая заявка — ${input.serviceName}`,
            content: [
              `Клиент: ${input.clientName}`,
              `Телефон: ${input.clientPhone}`,
              `Услуга: ${input.serviceName}`,
              `Дата: ${input.bookingDate}`,
              `Время: ${input.bookingTime}`,
              input.clientEmail ? `Email: ${input.clientEmail}` : null,
              input.comment ? `Комментарий: ${input.comment}` : null,
              `Номер заявки: ${referenceNumber}`,
            ].filter(Boolean).join('\n'),
          });
        } catch (e) {
          // Notification failure should not block booking creation
          console.warn('[Booking] Failed to send owner notification:', e);
        }

        try {
          await sendBookingEmails({
            referenceNumber,
            serviceName: input.serviceName,
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
        referenceNumber: z.string(),
        rating: z.number().min(1).max(5),
        text: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        const booking = await getBookingByReference(input.referenceNumber);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        if (booking.status !== "confirmed") throw new TRPCError({ code: "FORBIDDEN", message: "Only confirmed bookings can be reviewed" });

        const existing = await getReviewByBookingId(booking.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Review already submitted" });

        await createReview({
          bookingId: booking.id,
          referenceNumber: input.referenceNumber,
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
        return { success: true };
      }),

    declineBooking: adminMiddleware
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateBookingStatus(input.id, "declined");
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
