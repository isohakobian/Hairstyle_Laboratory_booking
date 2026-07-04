import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getAllServices, getServiceById, createBooking, getBookingByReference, getBookingsByEmail, getAllBookings, updateBookingStatus, isTimeSlotAvailable } from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
        // Check if slot is available
        const available = await isTimeSlotAvailable(input.bookingDate, input.bookingTime);
        if (!available) {
          throw new TRPCError({ code: "CONFLICT", message: "This time slot is already booked" });
        }

        // Generate reference number
        const referenceNumber = Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).substring(0, 4).toUpperCase();

        const result = await createBooking({
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

        // Get the created booking
        const booking = await getBookingByReference(referenceNumber);
        return booking;
      }),

    getByReference: publicProcedure
      .input(z.object({ referenceNumber: z.string() }))
      .query(({ input }) => getBookingByReference(input.referenceNumber)),

    getByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(({ input }) => getBookingsByEmail(input.email)),
  }),

  admin: router({
    bookings: protectedProcedure
      .use(async ({ ctx, next }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return next({ ctx });
      })
      .query(() => getAllBookings()),

    confirmBooking: protectedProcedure
      .use(async ({ ctx, next }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return next({ ctx });
      })
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateBookingStatus(input.id, "confirmed");
        return { success: true };
      }),

    declineBooking: protectedProcedure
      .use(async ({ ctx, next }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return next({ ctx });
      })
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateBookingStatus(input.id, "declined");
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
