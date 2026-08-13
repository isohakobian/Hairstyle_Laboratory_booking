export type CalendarInviteDetails = {
  referenceNumber: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  durationMinutes: number;
  totalPriceSummary?: string;
};

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00`;
}

export function createCalendarInvite(details: CalendarInviteDetails) {
  const [year, month, day] = details.bookingDate.split("-").map(Number);
  const [hours, minutes] = details.bookingTime.split(":").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const end = new Date(start.getTime() + details.durationMinutes * 60 * 1000);
  const description = [
    `Booking reference: ${details.referenceNumber}`,
    `Services: ${details.serviceName}`,
    details.totalPriceSummary ? `Price: ${details.totalPriceSummary}` : null,
  ].filter(Boolean).join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//Hairstyle Laboratory//Booking//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(`${details.referenceNumber}@hairstyle-laboratory`)}`,
    `DTSTART;TZID=Asia/Yerevan:${localDateTime(start)}`,
    `DTEND;TZID=Asia/Yerevan:${localDateTime(end)}`,
    `SUMMARY:${escapeIcs(`Hairstyle Laboratory — ${details.serviceName}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "LOCATION:Hairstyle Laboratory",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadCalendarInvite(details: CalendarInviteDetails) {
  const blob = new Blob([createCalendarInvite(details)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hairstyle-laboratory-booking.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
