import { completeBooking, findOrCreateClient, getClientMemory } from './clientMemory';
import { createBooking, getBookingByReference } from './db';
import { clearExampleTestBookings } from './testCleanup';
import { afterAll, describe, expect, it } from 'vitest';

describe('client memory', () => {
  afterAll(async () => {
    await clearExampleTestBookings();
  });

  it('keeps a private client profile and calculates a completed-visit briefing', async () => {
    const client = await findOrCreateClient({
      name: 'Memory Client',
      phone: '+37455000999',
      email: 'memory-client@example.com',
      birthday: '1994-02-10',
      instagram: 'memory.client',
    });
    const referenceNumber = `CM${Date.now().toString(36)}`.slice(0, 12).toUpperCase();
    await createBooking({
      referenceNumber,
      serviceId: 1,
      serviceName: 'Haircut',
      serviceSummary: 'Haircut',
      totalDurationMinutes: 45,
      totalPriceSummary: '15,000 ֏',
      bookingDate: '2099-11-12',
      bookingTime: '10:00',
      clientName: 'Memory Client',
      clientPhone: '+37455000999',
      clientEmail: 'memory-client@example.com',
      clientId: client.id,
      status: 'confirmed',
    });
    const booking = await getBookingByReference(referenceNumber);
    if (!booking) throw new Error('Test booking not found');
    await completeBooking(booking.id, 15000, 'Shorter on the sides next time');

    const memory = await getClientMemory(client.id);
    expect(memory?.profile.instagram).toBe('memory.client');
    expect(memory?.metrics.completedVisitCount).toBe(1);
    expect(memory?.metrics.totalSpentAmd).toBe(15000);
    expect(memory?.metrics.averageCheckAmd).toBe(15000);
    expect(memory?.metrics.popularServices).toContain('Haircut');
    expect(memory?.events.some(event => event.eventType === 'completed')).toBe(true);
  });
});
