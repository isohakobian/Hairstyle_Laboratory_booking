import type { Request, Response } from "express";
import {
  claimAutomationEmailDelivery,
  getBirthdayCrmCandidates,
  getBirthdayEmailTemplate,
  getPostVisitCrmCandidates,
  getPostVisitEmailTemplate,
  markAutomationEmailDeliverySent,
  recordClientEmailDelivery,
  releaseAutomationEmailDeliveryClaim,
} from "../db";
import { buildConfiguredBirthdayEmail, buildConfiguredPostVisitEmail, sendCrmEmail } from "../bookingEmail";
import { sdk } from "../_core/sdk";

const BOOKING_URL = "https://isaacbarber-axczkyb2.manus.space/booking";
const YEREVAN_TIME_ZONE = "Asia/Yerevan";
const POST_VISIT_DELAY_DAYS = 14;

function wasClaimed(result: unknown) {
  const header = Array.isArray(result) ? result[0] : result;
  return typeof header === "object"
    && header !== null
    && "affectedRows" in header
    && (header as { affectedRows?: unknown }).affectedRows === 1;
}

export function getYerevanDateDaysAgo(daysAgo: number, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: YEREVAN_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  const localDate = new Date(Date.UTC(read("year"), read("month") - 1, read("day")));
  localDate.setUTCDate(localDate.getUTCDate() - daysAgo);
  return localDate.toISOString().slice(0, 10);
}

function localDateBounds(date: string) {
  return {
    start: new Date(`${date}T00:00:00+04:00`),
    end: new Date(`${date}T23:59:59.999+04:00`),
  };
}

async function runPostVisitCheckIns() {
  const visitDate = getYerevanDateDaysAgo(POST_VISIT_DELAY_DAYS);
  const { start, end } = localDateBounds(visitDate);
  const [candidates, template] = await Promise.all([getPostVisitCrmCandidates(start, end), getPostVisitEmailTemplate()]);
  let sent = 0;
  let skipped = 0;
  const failures: Array<{ key: string; message: string }> = [];

  for (const candidate of candidates) {
    const key = `crm-post-visit-${candidate.booking.id}-${visitDate}`;
    const claim = await claimAutomationEmailDelivery(key);
    if (!wasClaimed(claim)) {
      skipped += 1;
      continue;
    }
    if (!candidate.client.email) {
      await markAutomationEmailDeliverySent(key);
      skipped += 1;
      continue;
    }
    const email = buildConfiguredPostVisitEmail(candidate.client.name, BOOKING_URL, template);
    try {
      const result = await sendCrmEmail(candidate.client.email, email, "crm-post-visit-14-day");
      const skippedDelivery = Boolean(result && typeof result === "object" && "skipped" in result && result.skipped);
      await markAutomationEmailDeliverySent(key);
      await recordClientEmailDelivery({ bookingId: candidate.booking.id, recipientEmail: candidate.client.email, notificationType: "crm-post-visit-14-day", deliveryStatus: skippedDelivery ? "skipped" : "sent", emailSubject: email.subject, emailText: email.text });
      if (skippedDelivery) skipped += 1;
      else sent += 1;
    } catch (error) {
      await releaseAutomationEmailDeliveryClaim(key);
      failures.push({ key, message: error instanceof Error ? error.message : "Unknown post-visit email error" });
    }
  }
  return { visitDate, checked: candidates.length, sent, skipped, failures };
}

async function runBirthdayGreetings() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: YEREVAN_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const year = Number(today.slice(0, 4));
  const monthDay = today.slice(5);
  const [candidates, template] = await Promise.all([getBirthdayCrmCandidates(monthDay), getBirthdayEmailTemplate()]);
  let sent = 0;
  let skipped = 0;
  const failures: Array<{ key: string; message: string }> = [];

  for (const candidate of candidates) {
    if (!candidate.client.email) {
      skipped += 1;
      continue;
    }
    const key = `crm-birthday-${candidate.client.id}-${year}`;
    const claim = await claimAutomationEmailDelivery(key);
    if (!wasClaimed(claim)) {
      skipped += 1;
      continue;
    }
    const email = buildConfiguredBirthdayEmail(candidate.client.name, BOOKING_URL, template);
    try {
      const result = await sendCrmEmail(candidate.client.email, email, "crm-birthday-greeting");
      const skippedDelivery = Boolean(result && typeof result === "object" && "skipped" in result && result.skipped);
      await markAutomationEmailDeliverySent(key);
      if (skippedDelivery) skipped += 1;
      else sent += 1;
    } catch (error) {
      await releaseAutomationEmailDeliveryClaim(key);
      failures.push({ key, message: error instanceof Error ? error.message : "Unknown birthday email error" });
    }
  }
  return { date: today, checked: candidates.length, sent, skipped, failures };
}

export async function crmAutomationsHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const [postVisit, birthdays] = await Promise.all([runPostVisitCheckIns(), runBirthdayGreetings()]);
    const failures = [...postVisit.failures, ...birthdays.failures];
    if (failures.length > 0) {
      return res.status(500).json({ error: "crm-delivery-failed", postVisit, birthdays, failures, context: { taskUid: user.taskUid, url: req.originalUrl }, timestamp: new Date().toISOString() });
    }
    return res.json({ ok: true, postVisit, birthdays });
  } catch (error) {
    console.error("[CRM automations] Scheduled handler failed:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "crm-automations-failed", stack: error instanceof Error ? error.stack : undefined, context: { url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}
