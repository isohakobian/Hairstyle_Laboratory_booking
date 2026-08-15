import type { Request, Response } from "express";
import {
  claimAppointmentReminder,
  claimAdditionalReminder,
  claimAutomationEmailDelivery,
  getAdditionalReminderDueBookings,
  getBookingReminderSettings,
  getAppointmentReminderDueBookings,
  getWeeklyBookingSummary,
  markAppointmentReminderSent,
  markAdditionalReminderSent,
  markAutomationEmailDeliverySent,
  releaseAppointmentReminderClaim,
  releaseAdditionalReminderClaim,
  releaseAutomationEmailDeliveryClaim,
  recordClientEmailDelivery,
} from "../db";
import { sendAppointmentReminderEmail, sendWeeklyBookingSummaryEmail } from "../bookingEmail";
import { sdk } from "../_core/sdk";

const STATUS_URL = "https://isaacbarber-axczkyb2.manus.space/status";

function wasClaimed(result: unknown) {
  const header = Array.isArray(result) ? result[0] : result;
  return typeof header === "object" && header !== null && "affectedRows" in header
    && ([1, 2] as unknown[]).includes((header as { affectedRows?: unknown }).affectedRows);
}

function getYerevanParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Yerevan", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

function formatTime(totalMinutes: number) {
  if (totalMinutes >= 24 * 60) return "24:00";
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

export function getYerevanReminderWindow(now = new Date(), minutesAhead = 1440) {
  const parts = getYerevanParts(now);
  const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  target.setUTCMinutes(target.getUTCMinutes() + minutesAhead);
  const startMinute = Math.floor((target.getUTCHours() * 60 + target.getUTCMinutes()) / 30) * 30;
  return {
    bookingDate: target.toISOString().slice(0, 10),
    startTime: formatTime(startMinute),
    endTime: formatTime(startMinute + 30),
  };
}

export function getPreviousYerevanWeek(now = new Date()) {
  const parts = getYerevanParts(now);
  const localCalendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const mondayOffset = (localCalendarDate.getUTCDay() + 6) % 7;
  const localMonday = new Date(localCalendarDate);
  localMonday.setUTCDate(localMonday.getUTCDate() - mondayOffset);
  const end = new Date(localMonday.getTime() - 4 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end, deliveryKey: `weekly-summary:${start.toISOString().slice(0, 10)}` };
}

function cronOnly(user: { isCron?: boolean; taskUid?: string }, res: Response) {
  if (!user.isCron || !user.taskUid) {
    res.status(403).json({ error: "cron-only" });
    return false;
  }
  return true;
}

export async function appointmentReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!cronOnly(user, res)) return;
    const settings = await getBookingReminderSettings();
    const window = getYerevanReminderWindow(new Date(), settings.firstOffsetMinutes);
    const dueBookings = settings.firstEnabled === "yes"
      ? await getAppointmentReminderDueBookings(window.bookingDate, window.startTime, window.endTime)
      : [];
    let sent = 0;
    let skipped = 0;
    const failures: Array<{ bookingId: number; message: string }> = [];

    for (const booking of dueBookings) {
      const claim = await claimAppointmentReminder(booking.id);
      if (!wasClaimed(claim)) { skipped += 1; continue; }
      if (!booking.clientEmail) { await markAppointmentReminderSent(booking.id); skipped += 1; continue; }
      try {
        const delivery = await sendAppointmentReminderEmail({
          referenceNumber: booking.referenceNumber, serviceName: booking.serviceSummary || booking.serviceName,
          totalDurationMinutes: booking.totalDurationMinutes || undefined, totalPriceSummary: booking.totalPriceSummary || undefined,
          bookingDate: booking.bookingDate, bookingTime: booking.bookingTime, clientName: booking.clientName,
          clientPhone: booking.clientPhone, clientEmail: booking.clientEmail, comment: booking.comment,
        }, STATUS_URL, settings.firstOffsetMinutes);
        await markAppointmentReminderSent(booking.id);
        await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType: `appointment-reminder-${settings.firstOffsetMinutes}`, deliveryStatus: delivery && typeof delivery === "object" && "skipped" in delivery && delivery.skipped ? "skipped" : "sent" });
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email delivery error";
        console.error(`[Appointment reminder] Booking ${booking.id} failed:`, error);
        await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType: `appointment-reminder-${settings.firstOffsetMinutes}`, deliveryStatus: "failed", errorMessage: message }).catch(() => undefined);
        await releaseAppointmentReminderClaim(booking.id);
        failures.push({ bookingId: booking.id, message });
      }
    }
    const secondWindow = getYerevanReminderWindow(new Date(), settings.secondOffsetMinutes);
    const secondaryBookings = settings.secondEnabled === "yes"
      ? await getAdditionalReminderDueBookings(secondWindow.bookingDate, secondWindow.startTime, secondWindow.endTime, settings.secondOffsetMinutes)
      : [];
    let secondSent = 0;
    let secondSkipped = 0;
    for (const booking of secondaryBookings) {
      const claim = await claimAdditionalReminder(booking.id, settings.secondOffsetMinutes);
      if (!wasClaimed(claim)) { secondSkipped += 1; continue; }
      if (!booking.clientEmail) { await markAdditionalReminderSent(booking.id, settings.secondOffsetMinutes); secondSkipped += 1; continue; }
      try {
        const delivery = await sendAppointmentReminderEmail({ referenceNumber: booking.referenceNumber, serviceName: booking.serviceSummary || booking.serviceName, totalDurationMinutes: booking.totalDurationMinutes || undefined, totalPriceSummary: booking.totalPriceSummary || undefined, bookingDate: booking.bookingDate, bookingTime: booking.bookingTime, clientName: booking.clientName, clientPhone: booking.clientPhone, clientEmail: booking.clientEmail, comment: booking.comment }, STATUS_URL, settings.secondOffsetMinutes);
        await markAdditionalReminderSent(booking.id, settings.secondOffsetMinutes);
        await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType: `appointment-reminder-${settings.secondOffsetMinutes}`, deliveryStatus: delivery && typeof delivery === "object" && "skipped" in delivery && delivery.skipped ? "skipped" : "sent" });
        secondSent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email delivery error";
        console.error(`[Appointment reminder] Booking ${booking.id} failed:`, error);
        await recordClientEmailDelivery({ bookingId: booking.id, recipientEmail: booking.clientEmail, notificationType: `appointment-reminder-${settings.secondOffsetMinutes}`, deliveryStatus: "failed", errorMessage: message }).catch(() => undefined);
        await releaseAdditionalReminderClaim(booking.id, settings.secondOffsetMinutes);
        failures.push({ bookingId: booking.id, message });
      }
    }
    if (failures.length > 0) return res.status(500).json({ error: "appointment-reminder-delivery-failed", sent, skipped, secondSent, secondSkipped, failures, context: { ...window, secondWindow, taskUid: user.taskUid }, timestamp: new Date().toISOString() });
    return res.json({ ok: true, ...window, sent, skipped, checked: dueBookings.length, secondWindow, secondSent, secondSkipped, secondChecked: secondaryBookings.length });
  } catch (error) {
    console.error("[Appointment reminder] Scheduled handler failed:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "appointment-reminder-failed", stack: error instanceof Error ? error.stack : undefined, context: { url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}

export async function weeklyBookingSummaryHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!cronOnly(user, res)) return;
    const period = getPreviousYerevanWeek();
    const claim = await claimAutomationEmailDelivery(period.deliveryKey);
    if (!wasClaimed(claim)) return res.json({ ok: true, skipped: "already-sent-or-in-progress", deliveryKey: period.deliveryKey });
    try {
      const summary = await getWeeklyBookingSummary(period.start, period.end);
      await sendWeeklyBookingSummaryEmail(summary);
      await markAutomationEmailDeliverySent(period.deliveryKey);
      return res.json({ ok: true, deliveryKey: period.deliveryKey, summary });
    } catch (error) {
      await releaseAutomationEmailDeliveryClaim(period.deliveryKey);
      throw error;
    }
  } catch (error) {
    console.error("[Weekly summary] Scheduled handler failed:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "weekly-summary-failed", stack: error instanceof Error ? error.stack : undefined, context: { url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}
