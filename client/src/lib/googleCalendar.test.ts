import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarBookingUrl } from './googleCalendar';

describe('buildGoogleCalendarBookingUrl', () => {
  it('creates a prefilled Yerevan-time event with the appointment duration and client details', () => {
    const url = new URL(buildGoogleCalendarBookingUrl({
      clientName: 'Alex', clientPhone: '+37455000000', clientEmail: 'alex@example.com', bookingDate: '2099-12-30', bookingTime: '14:15', totalDurationMinutes: 95,
      serviceSummary: 'Haircut + Beard Modeling', referenceNumber: 'REF001', comment: 'Shorter sides',
    }));

    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('ctz')).toBe('Asia/Yerevan');
    expect(url.searchParams.get('dates')).toBe('20991230T141500/20991230T155000');
    expect(url.searchParams.get('text')).toBe('Hairstyle Laboratory — Alex');
    expect(url.searchParams.get('details')).toContain('Услуги: Haircut + Beard Modeling');
    expect(url.searchParams.get('details')).toContain('Email: alex@example.com');
  });
});
