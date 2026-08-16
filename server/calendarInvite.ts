import type { BookingEmailDetails } from "./bookingEmail";
import { ENV } from "./_core/env";

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00`;
}

function formatUtcDateTime(date: Date) {
  return `${formatLocalDateTime(date)}Z`;
}

export function buildCalendarInvite(details: BookingEmailDetails) {
  const [year, month, day] = details.bookingDate.split("-").map(Number);
  const [hours, minutes] = details.bookingTime.split(":").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const end = new Date(start.getTime() + (details.totalDurationMinutes ?? 30) * 60 * 1000);
  const description = [
    `Booking reference: ${details.referenceNumber}`,
    `Services: ${details.serviceName}`,
    details.totalPriceSummary ? `Price: ${details.totalPriceSummary}` : null,
    `Location: ${ENV.studioAddress}`,
  ].filter(Boolean).join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//Hairstyle Laboratory//Booking//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(`${details.referenceNumber}@hairstyle-laboratory`)}`,
    `DTSTAMP:${formatUtcDateTime(new Date())}`,
    `DTSTART;TZID=Asia/Yerevan:${formatLocalDateTime(start)}`,
    `DTEND;TZID=Asia/Yerevan:${formatLocalDateTime(end)}`,
    `SUMMARY:${escapeIcs(`Hairstyle Laboratory — ${details.serviceName}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(ENV.studioAddress)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
