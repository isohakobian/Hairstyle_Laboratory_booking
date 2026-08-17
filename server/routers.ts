import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAllServices, getServiceById, createBookingWithServices, getBookingByReference, getBookingById, BookingIntervalConflictError,
  getBookingsByEmail, getAllBookings, updateBookingStatus, cancelBookingByClient, isTimeSlotAvailable,
  getBlockedDates, blockDate, unblockDate, createReview, getReviewByBookingId, createReviewToken,
  getReviewTokenByHash, markReviewTokenUsed,
  getPublishedReviews, getAllReviews, updateReviewPublished, createManagedService, setServiceActive, updateManagedService,
  createBookingStatusRecoveryToken, claimBookingStatusRecoveryToken, getSafeBookingStatusesByEmail,
  deleteBookingAndRelatedData, declineBookingForInvalidReceipt, getAdminTodaySummary, getBookingReminderSettings, getBookingsWithUnresolvedEmailFailures, getUnresolvedEmailDeliveryErrors, getClientDirectory, getClientEmailDeliveryHistory, getLatestBookingRescheduleEvent, getBookingPage, getManualDepositSettings, getReviewRequestDashboard, getReviewRequestEmailTemplate, getReviewRequestPage, getReviewRequestStats, getWeeklyBookingSummary, recordClientEmailDelivery, saveBookingReminderSettings, saveManualDepositSettings,   saveReviewRequestEmailTemplate, getPostVisitEmailTemplate, savePostVisitEmailTemplate, getBirthdayEmailTemplate, saveBirthdayEmailTemplate, updateManualDepositStatus, getCrmCampaigns, getCrmCampaignById, createCrmCampaign, updateCrmCampaign, getCrmCampaignDeliveries, getCrmCampaignStats, recordCrmCampaignDelivery, getCrmRecipients, saveClientCrmPreference, getClientCrmPreference, CrmAudienceFilter,
} from "./db";
import { TRPCError } from "@trpc/server";
import { buildAppointmentReminderEmail, buildBookingCancelledEmail, buildBookingDeclinedEmail, buildBookingRescheduledEmail, buildClientBookingEmail, buildClientConfirmationEmail, buildCrmBroadcastEmail, buildCrmTestEmail, sendAppointmentReminderEmail, sendBookingCancelledEmail, sendBookingDeclinedEmail, sendBookingEmails, sendBookingRescheduledEmail, sendBookingStatusRecoveryEmail, sendClientBookingRequestEmail, sendConfirmedBookingEmail, sendReviewRequestEmail, sendCrmEmail } from "./bookingEmail";
import { createReviewTokenValue, getBookingStatusRecoveryExpiry, getReviewTokenExpiry, hashReviewToken } from "./reviewToken";
import { blockDates, clearAvailabilityForDates, getAvailabilityWindows, getAvailableSlots, getPublicAvailableDates, setAvailabilityForDates } from "./availability";
import { completeBooking, createBookingEvent, findOrCreateClient, getClientMemory, getSignedVisitMediaUrl, recordReviewRequest, rescheduleBooking, updateClientProfile, uploadVisitMedia } from "./clientMemory";
import { getActiveAnnouncements, getAllAnnouncements, saveAnnouncement, setAnnouncementPublished, uploadAnnouncementImage } from "./announcements";
import { getManualDepositReceiptUrl, storeManualDepositReceipt } from "./manualDeposit";
import { getReferencePhotoUrl, storeReferencePhoto } from "./referencePhoto";
import { uploadCrmCampaignImage } from "./crmCampaignMedia";

// Admin middleware
const adminMiddleware = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const PUBLIC_BOOKING_URL = "https://isaacbarber-axczkyb2.manus.space/booking";
const PUBLIC_STATUS_URL = "https://isaacbarber-axczkyb2.manus.space/status";

function trackClientEmailDelivery(
  bookingId: number,
  recipientEmail: string,
  notificationType: string,
  delivery: Promise<unknown>,
  isManualResend: "yes" | "no" = "no",
  preview?: { subject: string; text: string },
) {
  void delivery.then(async (result) => {
    const skipped = Boolean(result && typeof result === "object" && "skipped" in result && (result as { skipped?: boolean }).skipped);
    await recordClientEmailDelivery({ bookingId, recipientEmail, notificationType, deliveryStatus: skipped ? "skipped" : "sent", isManualResend, emailSubject: preview?.subject, emailText: preview?.text });
  }).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    await recordClientEmailDelivery({ bookingId, recipientEmail, notificationType, deliveryStatus: "failed", errorMessage: message, isManualResend, emailSubject: preview?.subject, emailText: preview?.text }).catch((recordError: unknown) => console.error("[Client email history] Could not record failure:", recordError));
    console.error(`[Client email] ${notificationType} delivery failed:`, error);
  });
}

async function resendClientBookingNotification(bookingId: number) {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.clientEmail) throw new Error("This booking does not have a client email");
  const details = { referenceNumber: booking.referenceNumber, serviceName: booking.serviceSummary || booking.serviceName, totalDurationMinutes: booking.totalDurationMinutes || undefined, totalPriceSummary: booking.totalPriceSummary || undefined, bookingDate: booking.bookingDate, bookingTime: booking.bookingTime, clientName: booking.clientName, clientPhone: booking.clientPhone, clientEmail: booking.clientEmail, comment: booking.comment };
  const history = await getClientEmailDeliveryHistory(booking.id);
  const notificationType = history[0]?.notificationType ?? (booking.status === "confirmed" ? "booking-confirmed" : booking.status === "cancelled" ? "booking-cancelled" : booking.status === "declined" ? "booking-declined" : "booking-request");
  const reminderMatch = /^appointment-reminder-(\d+)$/.exec(notificationType);
  const reminderMinutes = reminderMatch ? Number(reminderMatch[1]) : null;
  const latestReschedule = notificationType === "booking-rescheduled" ? await getLatestBookingRescheduleEvent(booking.id) : null;
  const preview = reminderMinutes !== null ? buildAppointmentReminderEmail(details, PUBLIC_STATUS_URL, reminderMinutes) : notificationType === "booking-rescheduled" && latestReschedule?.previousDate && latestReschedule.previousTime ? buildBookingRescheduledEmail(details, latestReschedule.previousDate, latestReschedule.previousTime) : notificationType === "booking-cancelled" ? buildBookingCancelledEmail(details, booking.cancellationReason || "Cancelled", PUBLIC_BOOKING_URL) : notificationType === "booking-declined" ? buildBookingDeclinedEmail(details) : notificationType === "booking-request" ? buildClientBookingEmail(details) : buildClientConfirmationEmail(details);
  try {
    const result = reminderMinutes !== null ? await sendAppointmentReminderEmail(details, PUBLIC_STATUS_URL, reminderMinutes) : notificationType === "booking-rescheduled" && latestReschedule?.previousDate && latestReschedule.previousTime ? await sendBookingRescheduledEmail(details, latestReschedule.previousDate, latestReschedule.previousTime) : notificationType === "booking-cancelled" ? await sendBookingCancelledEmail(details, booking.cancellationReason || "Cancelled", PUBLIC_BOOKING_URL) : notificationType === "booking-declined" ? await sendBookingDeclinedEmail(details) : notificationType === "booking-request" ? await sendClientBookingRequestEmail(details) : await sendConfirmedBookingEmail(details);
    const skipped = Boolean(result && typeof result === "object" && "skipped" in result && result.skipped);
    await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType, deliveryStatus: skipped ? "skipped" : "sent", isManualResend: "yes", emailSubject: preview.subject, emailText: preview.text });
    return { success: true, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType, deliveryStatus: "failed", errorMessage: message, isManualResend: "yes", emailSubject: preview.subject, emailText: preview.text });
    throw error;
  }
}

async function sendCrmCampaignById(campaignId: number) {
  const campaign = await getCrmCampaignById(campaignId);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "CRM campaign not found" });
  const recipients = await getCrmRecipients(campaign.audienceFilter as CrmAudienceFilter, campaign.targetServiceId);
  const limitedRecipients = recipients.slice(0, 200);
  await updateCrmCampaign(campaign.id, { status: "sending", totalRecipients: limitedRecipients.length, sentCount: 0, errorCount: 0 });
  let sentCount = 0;
  let errorCount = 0;
  for (const client of limitedRecipients) {
    if (!client.email) continue;
    const email = buildCrmBroadcastEmail({
      clientName: client.name,
      subjectRu: campaign.subjectRu,
      subjectEn: campaign.subjectEn,
      bodyRu: campaign.bodyRu,
      bodyEn: campaign.bodyEn,
      imageUrl: campaign.imageUrl,
      actionUrl: PUBLIC_BOOKING_URL,
      actionLabelRu: "Выбрать время",
      actionLabelEn: "Choose a time",
    });
    try {
      const result = await sendCrmEmail(client.email, email, `crm-campaign-${campaign.id}`);
      const skipped = Boolean(result && typeof result === "object" && "skipped" in result && result.skipped);
      await recordCrmCampaignDelivery({ campaignId: campaign.id, clientId: client.id, recipientEmail: client.email, deliveryStatus: skipped ? "skipped" : "sent", emailSubject: email.subject, emailText: email.text });
      if (!skipped) sentCount += 1;
    } catch (error) {
      errorCount += 1;
      await recordCrmCampaignDelivery({ campaignId: campaign.id, clientId: client.id, recipientEmail: client.email, deliveryStatus: "failed", errorMessage: error instanceof Error ? error.message : "Unknown CRM email error", emailSubject: email.subject, emailText: email.text }).catch(() => undefined);
    }
  }
  await updateCrmCampaign(campaign.id, { status: errorCount > 0 ? "failed" : "completed", sentCount, errorCount });
  return { campaignId: campaign.id, totalRecipients: limitedRecipients.length, sentCount, errorCount, capped: recipients.length > limitedRecipients.length };
}

async function sendCrmCampaignTestToAdmin(input: {
  subjectRu: string;
  subjectEn: string;
  bodyRu: string;
  bodyEn: string;
  imageUrl?: string | null;
}, adminEmail: string | null | undefined, adminName: string | null | undefined) {
  if (!adminEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Your admin account does not have an email address" });
  const email = buildCrmTestEmail({
    subjectRu: input.subjectRu,
    subjectEn: input.subjectEn,
    bodyRu: input.bodyRu,
    bodyEn: input.bodyEn,
    imageUrl: input.imageUrl,
    actionUrl: PUBLIC_BOOKING_URL,
    actionLabelRu: "Выбрать время",
    actionLabelEn: "Choose a time",
  }, adminName || "Isaac");
  const result = await sendCrmEmail(adminEmail, email, "crm-campaign-test");
  const skipped = Boolean(result && typeof result === "object" && "skipped" in result && result.skipped);
  return { success: true, skipped, recipientEmail: adminEmail, subject: email.subject };
}

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

const manualDepositSettingsInput = z.object({
  recipientName: z.string().trim().max(255),
  cardDetails: z.string().trim().max(255),
  policyRu: z.string().trim().min(1).max(6000),
  policyEn: z.string().trim().min(1).max(6000),
  isEnabled: z.enum(["yes", "no"]),
}).superRefine((input, ctx) => {
  if (input.isEnabled !== "yes") return;
  if (!input.recipientName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recipientName"], message: "Recipient name is required when manual deposits are enabled" });
  if (!input.cardDetails) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cardDetails"], message: "Payment details are required when manual deposits are enabled" });
});

const bookingReminderSettingsInput = z.object({
  firstOffsetMinutes: z.number().int().min(30).max(10_080),
  firstEnabled: z.enum(["yes", "no"]),
  secondOffsetMinutes: z.number().int().min(15).max(1_440),
  secondEnabled: z.enum(["yes", "no"]),
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

  manualDeposit: router({
    settings: publicProcedure.query(async () => {
      const settings = await getManualDepositSettings();
      return settings.isEnabled === "yes" ? settings : { ...settings, recipientName: "", cardDetails: "" };
    }),
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
        policyAccepted: z.boolean().optional(),
        newsletterConsented: z.boolean().optional(),
        receipt: z.object({
          fileName: z.string().min(1).max(255),
          mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          base64Data: z.string().min(1).max(7_000_000),
        }).optional(),
        referencePhoto: z.object({
          fileName: z.string().min(1).max(255),
          mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          base64Data: z.string().min(1).max(11_000_000),
        }).optional(),
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
        const manualDepositSettings = await getManualDepositSettings();
        const requiresManualDeposit = manualDepositSettings.isEnabled === "yes" && depositTotalAmd > 0;
        if (input.policyAccepted !== true) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "The cancellation policy must be accepted before booking" });
        }
        if (requiresManualDeposit && !input.receipt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A payment receipt is required for this booking" });
        }

        const availableSlots = await getAvailableSlots(input.bookingDate, totalDurationMinutes);
        if (!availableSlots.includes(input.bookingTime)) {
          throw new TRPCError({ code: "CONFLICT", message: "This date or time slot is not available" });
        }

        const referenceNumber = Math.random().toString(36).substring(2, 8).toUpperCase() +
          Date.now().toString(36).substring(0, 4).toUpperCase();
        const receipt = input.receipt
          ? await storeManualDepositReceipt({ referenceNumber, ...input.receipt })
          : null;
        const referencePhoto = input.referencePhoto
          ? await storeReferencePhoto({ referenceNumber, ...input.referencePhoto })
          : null;
        const client = await findOrCreateClient({
          name: input.clientName.trim(),
          phone: input.clientPhone.trim(),
          email: input.clientEmail,
          birthday: input.birthday,
          instagram: input.instagram?.trim().replace(/^@/, "") || undefined,
        });
        await saveClientCrmPreference(client.id, input.newsletterConsented === true ? "yes" : "no");

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
            manualDepositAmountAmd: requiresManualDeposit ? depositTotalAmd : null,
            manualDepositStatus: requiresManualDeposit ? "proof_received" : "not_required",
            manualDepositReceiptKey: receipt?.storageKey ?? null,
            manualDepositReceiptFileName: receipt?.fileName ?? null,
            manualDepositReceiptMimeType: receipt?.mimeType ?? null,
            referencePhotoKey: referencePhoto?.storageKey ?? null,
            referencePhotoFileName: referencePhoto?.fileName ?? null,
            referencePhotoMimeType: referencePhoto?.mimeType ?? null,
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
          const deliveryResults = await sendBookingEmails({
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
            manualDepositAmountAmd: requiresManualDeposit ? depositTotalAmd : null,
            receipt: receipt ? { fileName: receipt.fileName, mimeType: receipt.mimeType, content: receipt.content } : null,
          });
          if (booking?.clientEmail) {
            const requestPreview = buildClientBookingEmail({ referenceNumber, serviceName: serviceSummary, totalDurationMinutes, totalPriceSummary, bookingDate: input.bookingDate, bookingTime: input.bookingTime, clientName: input.clientName, clientPhone: input.clientPhone, clientEmail: input.clientEmail, comment: input.comment });
            const clientResult = Array.isArray(deliveryResults) ? deliveryResults[deliveryResults.length - 1] : deliveryResults;
            const skipped = Boolean(clientResult && typeof clientResult === "object" && "skipped" in clientResult && (clientResult as { skipped?: boolean }).skipped);
            const failed = Boolean(clientResult && typeof clientResult === "object" && "status" in clientResult && (clientResult as PromiseRejectedResult).status === "rejected");
            await recordClientEmailDelivery({
              bookingId: booking.id,
              recipientEmail: booking.clientEmail,
              notificationType: "booking-request",
              deliveryStatus: failed ? "failed" : skipped ? "skipped" : "sent",
              errorMessage: failed ? String((clientResult as PromiseRejectedResult).reason) : null,
              emailSubject: requestPreview.subject,
              emailText: requestPreview.text,
            });
          }
        } catch (e) {
          if (booking?.clientEmail) {
            const requestPreview = buildClientBookingEmail({ referenceNumber, serviceName: serviceSummary, totalDurationMinutes, totalPriceSummary, bookingDate: input.bookingDate, bookingTime: input.bookingTime, clientName: input.clientName, clientPhone: input.clientPhone, clientEmail: input.clientEmail, comment: input.comment });
            await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType: "booking-request", deliveryStatus: "failed", errorMessage: e instanceof Error ? e.message : "Unknown email delivery error", emailSubject: requestPreview.subject, emailText: requestPreview.text }).catch(() => undefined);
          }
          // Email delivery must never block a successfully created booking.
          console.warn('[Booking] Failed to send Gmail booking emails:', e);
        }

        return booking;
      }),

    getByReference: publicProcedure
      .input(z.object({ referenceNumber: z.string() }))
      .query(({ input }) => getBookingByReference(input.referenceNumber)),

    cancelByClient: publicProcedure
      .input(z.object({
        referenceNumber: z.string().trim().min(6).max(12).transform(value => value.toUpperCase()),
        clientEmail: z.string().trim().email().max(320).transform(value => value.toLowerCase()),
        reason: z.string().trim().min(3).max(1000),
      }))
      .mutation(async ({ input }) => {
        const result = await cancelBookingByClient(input);
        if (!result.cancelled || !result.bookingId) throw new TRPCError({ code: "BAD_REQUEST", message: "The booking could not be cancelled" });
        const booking = await getBookingById(result.bookingId);
        if (booking?.clientEmail) {
          trackClientEmailDelivery(booking.id, booking.clientEmail, "booking-cancelled", sendBookingCancelledEmail({
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
          }, input.reason, PUBLIC_BOOKING_URL), "no", buildBookingCancelledEmail({
            referenceNumber: booking.referenceNumber, serviceName: booking.serviceSummary || booking.serviceName,
            totalDurationMinutes: booking.totalDurationMinutes || undefined, totalPriceSummary: booking.totalPriceSummary || undefined,
            bookingDate: booking.bookingDate, bookingTime: booking.bookingTime, clientName: booking.clientName,
            clientPhone: booking.clientPhone, clientEmail: booking.clientEmail, comment: booking.comment,
          }, input.reason, PUBLIC_BOOKING_URL));
        }
        return { success: true };
      }),

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
    today: adminMiddleware.query(() => getAdminTodaySummary()),
    weeklyBookingStats: adminMiddleware.query(async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return getWeeklyBookingSummary(start, end);
    }),
    emailDeliveryErrors: adminMiddleware.query(() => getUnresolvedEmailDeliveryErrors()),
    bookingReminderSettings: adminMiddleware.query(() => getBookingReminderSettings()),
    saveBookingReminderSettings: adminMiddleware.input(bookingReminderSettingsInput).mutation(({ input }) => saveBookingReminderSettings(input)),
    manualDepositSettings: adminMiddleware.query(() => getManualDepositSettings()),
    saveManualDepositSettings: adminMiddleware
      .input(manualDepositSettingsInput)
      .mutation(({ input }) => saveManualDepositSettings({ ...input, instagramUrl: "" })),
    clientEmailHistory: adminMiddleware
      .input(z.object({ bookingId: z.number().int().positive() }))
      .query(({ input }) => getClientEmailDeliveryHistory(input.bookingId)),
    referencePhotoUrl: adminMiddleware
      .input(z.object({ bookingId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const booking = await getBookingById(input.bookingId);
        if (!booking || !booking.referencePhotoKey) return null;
        return getReferencePhotoUrl(booking.referencePhotoKey);
      }),
    resendBookingNotification: adminMiddleware
      .input(z.object({ bookingId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const booking = await getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        if (!booking.clientEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "This booking does not have a client email" });
        const details = {
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
        };
        const history = await getClientEmailDeliveryHistory(booking.id);
        const latestClientEmail = history[0];
        const notificationType = latestClientEmail?.notificationType ?? (booking.status === "confirmed" ? "booking-confirmed" : booking.status === "cancelled" ? "booking-cancelled" : booking.status === "declined" ? "booking-declined" : "booking-request");
        const reminderMatch = /^appointment-reminder-(\d+)$/.exec(notificationType);
        const reminderMinutes = reminderMatch ? Number(reminderMatch[1]) : null;
        const latestReschedule = notificationType === "booking-rescheduled" ? await getLatestBookingRescheduleEvent(booking.id) : null;
        const preview = reminderMinutes !== null
          ? buildAppointmentReminderEmail(details, PUBLIC_STATUS_URL, reminderMinutes)
          : notificationType === "booking-rescheduled" && latestReschedule?.previousDate && latestReschedule.previousTime
            ? buildBookingRescheduledEmail(details, latestReschedule.previousDate, latestReschedule.previousTime)
            : notificationType === "booking-cancelled"
              ? buildBookingCancelledEmail(details, booking.cancellationReason || "Cancelled", PUBLIC_BOOKING_URL)
              : notificationType === "booking-declined"
                ? buildBookingDeclinedEmail(details)
                : notificationType === "booking-request"
                  ? buildClientBookingEmail(details)
                  : buildClientConfirmationEmail(details);
        try {
          const result = reminderMinutes !== null
            ? await sendAppointmentReminderEmail(details, PUBLIC_STATUS_URL, reminderMinutes)
            : notificationType === "booking-rescheduled" && latestReschedule?.previousDate && latestReschedule.previousTime
            ? await sendBookingRescheduledEmail(details, latestReschedule.previousDate, latestReschedule.previousTime)
            : notificationType === "booking-cancelled"
              ? await sendBookingCancelledEmail(details, booking.cancellationReason || "Cancelled", PUBLIC_BOOKING_URL)
              : notificationType === "booking-declined"
                ? await sendBookingDeclinedEmail(details)
                : notificationType === "booking-request"
                  ? await sendClientBookingRequestEmail(details)
                  : await sendConfirmedBookingEmail(details);
          const skipped = Boolean(result && typeof result === "object" && "skipped" in result && result.skipped);
          await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType, deliveryStatus: skipped ? "skipped" : "sent", isManualResend: "yes", emailSubject: preview.subject, emailText: preview.text });
          return { success: true, skipped };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown email delivery error";
          await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType, deliveryStatus: "failed", errorMessage: message, isManualResend: "yes", emailSubject: preview.subject, emailText: preview.text });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The email could not be sent. The failed attempt was recorded in the booking history." });
        }
      }),
    batchResendEmailFailures: adminMiddleware.mutation(async () => {
      const { bookings: failedBookings, totalUnresolved } = await getBookingsWithUnresolvedEmailFailures(50);
      let sent = 0;
      let skipped = 0;
      let failed = 0;
      for (const booking of failedBookings) {
        try {
          const result = await resendClientBookingNotification(booking.id);
          if (result.skipped) skipped += 1;
          else sent += 1;
        } catch {
          failed += 1;
        }
      }
      const { totalUnresolved: remaining } = await getBookingsWithUnresolvedEmailFailures(1);
      return { checked: failedBookings.length, sent, skipped, failed, remaining, limited: totalUnresolved > failedBookings.length };
    }),
    updateManualDepositStatus: adminMiddleware
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["awaiting_proof", "proof_received", "verified", "waived"]) }))
      .mutation(({ input }) => updateManualDepositStatus(input.id, input.status)),
    declineBookingForInvalidReceipt: adminMiddleware
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const result = await declineBookingForInvalidReceipt(input.id);
        if (!result.declined) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        return { success: true };
      }),
    manualDepositReceiptUrl: adminMiddleware
      .input(z.object({ bookingId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const booking = await getBookingById(input.bookingId);
        if (!booking?.manualDepositReceiptKey) throw new TRPCError({ code: "NOT_FOUND", message: "Deposit receipt not found" });
        return getManualDepositReceiptUrl(booking.manualDepositReceiptKey);
      }),
    bookingPage: adminMiddleware
      .input(z.object({
        page: z.number().int().min(1),
        pageSize: z.number().int().min(1).max(50),
        status: z.enum(["all", "pending", "confirmed", "declined", "cancelled"]).optional(),
        search: z.string().trim().max(160).optional(),
        sort: z.enum(["appointmentAsc", "appointmentDesc", "newest", "statusAsc"]).optional(),
      }))
      .query(({ input }) => getBookingPage(input)),
    announcements: adminMiddleware.query(() => getAllAnnouncements()),
    crmCampaigns: adminMiddleware.query(() => getCrmCampaigns()),
    crmCampaignDeliveries: adminMiddleware
      .input(z.object({ campaignId: z.number().int().positive() }))
      .query(({ input }) => getCrmCampaignDeliveries(input.campaignId)),
    crmAudiencePreview: adminMiddleware
      .input(z.object({ audienceFilter: z.enum(["newsletter_consented", "upcoming_booking", "recent_6m", "specific_service"]), targetServiceId: z.number().int().positive().nullable().optional() }))
      .query(({ input }) => getCrmRecipients(input.audienceFilter, input.targetServiceId)),
    crmCampaignStats: adminMiddleware
      .input(z.object({ campaignId: z.number().int().positive() }))
      .query(({ input }) => getCrmCampaignStats(input.campaignId)),
    saveCrmCampaign: adminMiddleware
      .input(z.object({
        id: z.number().int().positive().optional(),
        title: z.string().trim().min(1).max(255),
        subjectRu: z.string().trim().min(1).max(255),
        subjectEn: z.string().trim().min(1).max(255),
        bodyRu: z.string().trim().min(1).max(6000),
        bodyEn: z.string().trim().min(1).max(6000),
        imageUrl: z.string().trim().max(1000).nullable().optional(),
        audienceFilter: z.enum(["newsletter_consented", "upcoming_booking", "recent_6m", "specific_service"]),
        targetServiceId: z.number().int().positive().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...values } = input;
        if (id) {
          await updateCrmCampaign(id, values);
          return { id };
        }
        return { id: await createCrmCampaign(values) };
      }),
    uploadCrmCampaignImage: adminMiddleware
      .input(z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        base64Data: z.string().min(1).max(1_700_000),
      }))
      .mutation(({ input }) => uploadCrmCampaignImage(input)),
    sendCrmCampaign: adminMiddleware
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => sendCrmCampaignById(input.id)),
    sendTestCrmCampaign: adminMiddleware
      .input(z.object({
        subjectRu: z.string().trim().min(1).max(255),
        subjectEn: z.string().trim().min(1).max(255),
        bodyRu: z.string().trim().min(1).max(6000),
        bodyEn: z.string().trim().min(1).max(6000),
        imageUrl: z.string().trim().max(1000).nullable().optional(),
      }))
      .mutation(({ input, ctx }) => sendCrmCampaignTestToAdmin(input, ctx.user.email, ctx.user.name)),
    clientCrmPreference: adminMiddleware
      .input(z.object({ clientId: z.number().int().positive() }))
      .query(({ input }) => getClientCrmPreference(input.clientId)),
    saveClientCrmPreference: adminMiddleware
      .input(z.object({ clientId: z.number().int().positive(), newsletterConsented: z.enum(["yes", "no"]) }))
      .mutation(({ input }) => saveClientCrmPreference(input.clientId, input.newsletterConsented)),
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
        imageUrl: z.string().max(1000).nullable().optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        isPublished: z.enum(["yes", "no"]),
      }))
      .mutation(({ input }) => saveAnnouncement(input)),

    uploadAnnouncementImage: adminMiddleware
      .input(z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        base64Data: z.string().min(1).max(1_700_000),
      }))
      .mutation(({ input }) => uploadAnnouncementImage(input)),

    setAnnouncementPublished: adminMiddleware
      .input(z.object({ id: z.number().int().positive(), isPublished: z.enum(["yes", "no"]) }))
      .mutation(({ input }) => setAnnouncementPublished(input.id, input.isPublished)),

    confirmBooking: adminMiddleware
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const booking = await getBookingById(input.id);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        if (booking.manualDepositAmountAmd && booking.manualDepositStatus !== "verified") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Verify the manual deposit receipt before confirming this booking" });
        }
        await updateBookingStatus(input.id, "confirmed");
        if (booking) await createBookingEvent({ bookingId: booking.id, eventType: "confirmed" });
        if (booking?.clientEmail) {
          try {
            const confirmationDetails = {
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
            };
            const result = await sendConfirmedBookingEmail(confirmationDetails);
            const confirmationPreview = buildClientConfirmationEmail(confirmationDetails);
            await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType: "booking-confirmed", deliveryStatus: result && typeof result === "object" && "skipped" in result && result.skipped ? "skipped" : "sent", emailSubject: confirmationPreview.subject, emailText: confirmationPreview.text });
          } catch (error) {
            const confirmationPreview = buildClientConfirmationEmail({ referenceNumber: booking.referenceNumber, serviceName: booking.serviceSummary || booking.serviceName, totalDurationMinutes: booking.totalDurationMinutes || undefined, totalPriceSummary: booking.totalPriceSummary || undefined, bookingDate: booking.bookingDate, bookingTime: booking.bookingTime, clientName: booking.clientName, clientPhone: booking.clientPhone, clientEmail: booking.clientEmail, comment: booking.comment });
            await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType: "booking-confirmed", deliveryStatus: "failed", errorMessage: error instanceof Error ? error.message : "Unknown email delivery error", emailSubject: confirmationPreview.subject, emailText: confirmationPreview.text }).catch(() => undefined);
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

    clearAvailability: adminMiddleware
      .input(z.object({ dates: z.array(z.string()).min(1).max(62) }))
      .mutation(async ({ input }) => {
        await clearAvailabilityForDates(input.dates);
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
        const booking = await getBookingById(input.id);
        await rescheduleBooking(input.id, input.bookingDate, input.bookingTime, input.note);
        if (booking?.clientEmail) {
          trackClientEmailDelivery(booking.id, booking.clientEmail, "booking-rescheduled", sendBookingRescheduledEmail({
            referenceNumber: booking.referenceNumber,
            serviceName: booking.serviceSummary || booking.serviceName,
            totalDurationMinutes: booking.totalDurationMinutes || undefined,
            totalPriceSummary: booking.totalPriceSummary || undefined,
            bookingDate: input.bookingDate,
            bookingTime: input.bookingTime,
            clientName: booking.clientName,
            clientPhone: booking.clientPhone,
            clientEmail: booking.clientEmail,
            comment: booking.comment,
          }, booking.bookingDate, booking.bookingTime), "no", buildBookingRescheduledEmail({
            referenceNumber: booking.referenceNumber, serviceName: booking.serviceSummary || booking.serviceName,
            totalDurationMinutes: booking.totalDurationMinutes || undefined, totalPriceSummary: booking.totalPriceSummary || undefined,
            bookingDate: input.bookingDate, bookingTime: input.bookingTime, clientName: booking.clientName,
            clientPhone: booking.clientPhone, clientEmail: booking.clientEmail, comment: booking.comment,
          }, booking.bookingDate, booking.bookingTime));
        }
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
    reviewRequestPage: adminMiddleware
      .input(z.object({
        page: z.number().int().min(1),
        pageSize: z.number().int().min(1).max(50),
        status: z.enum(["all", "awaiting", "received"]).optional(),
        sort: z.enum(["sentDesc", "sentAsc", "receivedDesc"]).optional(),
      }))
      .query(({ input }) => getReviewRequestPage(input)),
    reviewRequestStats: adminMiddleware.query(() => getReviewRequestStats()),
    reviewRequestTemplate: adminMiddleware.query(() => getReviewRequestEmailTemplate()),

    saveReviewRequestTemplate: adminMiddleware
      .input(z.object({
        subjectRu: z.string().trim().min(1).max(255),
        subjectEn: z.string().trim().min(1).max(255),
        bodyRu: z.string().trim().min(1).max(6000),
        bodyEn: z.string().trim().min(1).max(6000),
      }))
      .mutation(({ input }) => saveReviewRequestEmailTemplate(input)),

    postVisitTemplate: adminMiddleware.query(() => getPostVisitEmailTemplate()),
    savePostVisitTemplate: adminMiddleware
      .input(z.object({
        subjectRu: z.string().trim().min(1).max(255),
        subjectEn: z.string().trim().min(1).max(255),
        bodyRu: z.string().trim().min(1).max(6000),
        bodyEn: z.string().trim().min(1).max(6000),
      }))
      .mutation(({ input }) => savePostVisitEmailTemplate(input)),

    birthdayTemplate: adminMiddleware.query(() => getBirthdayEmailTemplate()),
    saveBirthdayTemplate: adminMiddleware
      .input(z.object({
        subjectRu: z.string().trim().min(1).max(255),
        subjectEn: z.string().trim().min(1).max(255),
        bodyRu: z.string().trim().min(1).max(6000),
        bodyEn: z.string().trim().min(1).max(6000),
      }))
      .mutation(({ input }) => saveBirthdayEmailTemplate(input)),

    publishReview: adminMiddleware
      .input(z.object({ id: z.number(), publish: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateReviewPublished(input.id, input.publish ? "yes" : "no");
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
