import { describe, expect, it } from 'vitest';
import { createCalendarInvite } from './calendarInvite';

describe('createCalendarInvite', () => {
  it('includes the exact studio address in the downloadable event', () => {
    const invite = createCalendarInvite({
      referenceNumber: 'BOOK123',
      serviceName: 'Haircut',
      bookingDate: '2099-12-30',
      bookingTime: '14:00',
      durationMinutes: 45,
    });

    expect(invite).toContain('LOCATION:Armenia\\, Yerevan\\, Pushkin 44');
    expect(invite).toContain('Location: Armenia\\, Yerevan\\, Pushkin 44');
  });
});
