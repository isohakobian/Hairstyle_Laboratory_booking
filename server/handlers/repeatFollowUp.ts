import type { Request, Response } from "express";
import {
  claimRepeatFollowUp,
  getRepeatFollowUpDueBookings,
  markRepeatFollowUpSent,
  releaseRepeatFollowUpClaim,
} from "../db";
import { sendRepeatFollowUpEmail } from "../bookingEmail";
import { sdk } from "../_core/sdk";

const BOOKING_URL = "https://isaacbarber-axczkyb2.manus.space/booking";
const FOLLOW_UP_DELAY_DAYS = 14 * 7;

export function getYerevanDateDaysAgo(daysAgo: number, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Yerevan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const readPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  const localDate = new Date(Date.UTC(readPart("year"), readPart("month") - 1, readPart("day")));
  localDate.setUTCDate(localDate.getUTCDate() - daysAgo);
  return localDate.toISOString().slice(0, 10);
}

function wasClaimed(result: unknown) {
  const header = Array.isArray(result) ? result[0] : result;
  return typeof header === "object"
    && header !== null
    && "affectedRows" in header
    && (header as { affectedRows?: unknown }).affectedRows === 1;
}

export async function repeatFollowUpHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const visitDate = getYerevanDateDaysAgo(FOLLOW_UP_DELAY_DAYS);
    const dueBookings = await getRepeatFollowUpDueBookings(visitDate);
    let sent = 0;
    let skipped = 0;
    const failures: Array<{ bookingId: number; message: string }> = [];

    for (const booking of dueBookings) {
      const claim = await claimRepeatFollowUp(booking.id);
      if (!wasClaimed(claim)) {
        skipped += 1;
        continue;
      }

      if (!booking.clientEmail) {
        await markRepeatFollowUpSent(booking.id);
        skipped += 1;
        continue;
      }

      try {
        await sendRepeatFollowUpEmail({
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
        }, BOOKING_URL);
        await markRepeatFollowUpSent(booking.id);
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email delivery error";
        console.error(`[Repeat follow-up] Booking ${booking.id} failed:`, error);
        await releaseRepeatFollowUpClaim(booking.id);
        failures.push({ bookingId: booking.id, message });
      }
    }

    if (failures.length > 0) {
      return res.status(500).json({
        error: "repeat-follow-up-delivery-failed",
        sent,
        skipped,
        failures,
        context: { visitDate, taskUid: user.taskUid },
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({ ok: true, visitDate, sent, skipped, checked: dueBookings.length });
  } catch (error) {
    console.error("[Repeat follow-up] Scheduled handler failed:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "repeat-follow-up-failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
