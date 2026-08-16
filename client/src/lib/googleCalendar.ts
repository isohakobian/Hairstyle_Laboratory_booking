import { STUDIO_ADDRESS } from '../../../shared/const';

export type GoogleCalendarBooking = {
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientInstagram?: string | null;
  bookingDate: string;
  bookingTime: string;
  totalDurationMinutes?: number | null;
  serviceSummary?: string | null;
  serviceName?: string | null;
  referenceNumber?: string | null;
  comment?: string | null;
};

function formatCalendarDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}00`;
}

export function buildGoogleCalendarBookingUrl(booking: GoogleCalendarBooking) {
  const [year, month, day] = booking.bookingDate.split('-').map(Number);
  const [hours, minutes] = booking.bookingTime.split(':').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const end = new Date(start.getTime() + Math.max(booking.totalDurationMinutes ?? 30, 1) * 60_000);
  const services = booking.serviceSummary || booking.serviceName || 'Appointment';
  const details = [
    `Клиент: ${booking.clientName}`,
    `Услуги: ${services}`,
    booking.clientPhone ? `Телефон: ${booking.clientPhone}` : null,
    booking.clientEmail ? `Email: ${booking.clientEmail}` : null,
    booking.clientInstagram ? `Instagram: @${booking.clientInstagram.replace(/^@/, '')}` : null,
    booking.referenceNumber ? `Код записи: ${booking.referenceNumber}` : null,
    booking.comment ? `Комментарий: ${booking.comment}` : null,
  ].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Hairstyle Laboratory — ${booking.clientName}`,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
    ctz: 'Asia/Yerevan',
    details,
    location: STUDIO_ADDRESS,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
