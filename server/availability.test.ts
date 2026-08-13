import { blockDates, getAvailableSlots, getPublicAvailableDates, setAvailabilityForDates } from './availability';
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
});
