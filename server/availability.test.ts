import { blockDates, clearAvailabilityForDates, getAvailableSlots, getBlockedDates, getPublicAvailableDates, setAvailabilityForDates } from './availability';
import { createBookingWithServices } from './db';
import { clearExampleTestBookings } from './testCleanup';
import { afterAll, describe, expect, it } from 'vitest';

describe('availability', () => {
  const dates = ['2099-11-10', '2099-11-11'];

  afterAll(async () => {
    await clearExampleTestBookings();
  });

  it('opens multiple selected dates and creates only slots that fit the service duration', async () => {
    await setAvailabilityForDates(dates, '10:00', '11:00', 30);

    const availableDates = await getPublicAvailableDates();
    expect(availableDates).toEqual(expect.arrayContaining(dates));
    expect(await getAvailableSlots(dates[0], 45)).toEqual(['10:00']);
    expect(await getAvailableSlots(dates[0], 30)).toEqual(['10:00', '10:30']);
  });

  it('removes slots from the public booking view when a selected date is closed', async () => {
    await blockDates([dates[0]], 'Test day off');

    expect(await getAvailableSlots(dates[0], 30)).toEqual([]);
    expect(await getPublicAvailableDates()).not.toContain(dates[0]);
    expect(await getPublicAvailableDates()).toContain(dates[1]);
  });

  it('clears both the closed marker and manually configured slots without touching booking records', async () => {
    await clearAvailabilityForDates([dates[0]]);

    expect(await getAvailableSlots(dates[0], 30)).toEqual([]);
    expect(await getPublicAvailableDates()).not.toContain(dates[0]);
    expect((await getBlockedDates()).map(entry => entry.date)).not.toContain(dates[0]);
  });

  it('rejects a direct overlapping insert while allowing an appointment after the full combined interval', async () => {
    const date = '2099-11-12';
    const selectedServices = [{ serviceId: 1, serviceName: 'Haircut + Beard Modeling', durationMinutes: 95, priceSummary: '27,000 ֏' }];
    await createBookingWithServices({
      referenceNumber: 'INTVLOCK1', serviceId: 1, serviceName: 'Haircut + Beard Modeling', serviceSummary: 'Haircut + Beard Modeling',
      totalDurationMinutes: 95, totalPriceSummary: '27,000 ֏', bookingDate: date, bookingTime: '10:00',
      clientName: 'Interval Lock', clientPhone: '+37455000111', clientEmail: 'interval-lock@example.com', status: 'pending',
    }, selectedServices);

    await expect(createBookingWithServices({
      referenceNumber: 'INTVLOCK2', serviceId: 1, serviceName: 'Haircut', serviceSummary: 'Haircut',
      totalDurationMinutes: 30, totalPriceSummary: '15,000 ֏', bookingDate: date, bookingTime: '10:30',
      clientName: 'Overlap Lock', clientPhone: '+37455000112', clientEmail: 'overlap-lock@example.com', status: 'pending',
    }, [{ serviceId: 1, serviceName: 'Haircut', durationMinutes: 30, priceSummary: '15,000 ֏' }])).rejects.toThrow(/overlaps/i);

    await expect(createBookingWithServices({
      referenceNumber: 'INTVLOCK3', serviceId: 1, serviceName: 'Haircut', serviceSummary: 'Haircut',
      totalDurationMinutes: 30, totalPriceSummary: '15,000 ֏', bookingDate: date, bookingTime: '11:35',
      clientName: 'Next Lock', clientPhone: '+37455000113', clientEmail: 'next-lock@example.com', status: 'pending',
    }, [{ serviceId: 1, serviceName: 'Haircut', durationMinutes: 30, priceSummary: '15,000 ֏' }])).resolves.toBeTypeOf('number');
  });
});
