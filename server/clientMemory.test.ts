import { completeBooking, findOrCreateClient, getClientMemory } from './clientMemory';
import { cancelBookingByClient, createBookingWithServices, getBookingByReference } from './db';
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
    await createBookingWithServices({
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
    }, [{ serviceId: 1, serviceName: 'Haircut', durationMinutes: 45, priceSummary: '15,000 ֏' }]);
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
    expect(memory?.visits[0]?.serviceIds).toEqual([1]);
  });

  it('keeps a client cancellation reason in the private visit history', async () => {
    const client = await findOrCreateClient({
      name: 'Cancelled Memory Client',
      phone: '+37455000888',
      email: 'cancelled-memory-client@example.com',
    });
    const referenceNumber = `CX${Date.now().toString(36)}`.slice(0, 12).toUpperCase();
    await createBookingWithServices({
      referenceNumber,
      serviceId: 1,
      serviceName: 'Haircut',
      serviceSummary: 'Haircut',
      totalDurationMinutes: 45,
      totalPriceSummary: '15,000 ֏',
      bookingDate: '2099-12-13',
      bookingTime: '11:00',
      clientName: 'Cancelled Memory Client',
      clientPhone: '+37455000888',
      clientEmail: 'cancelled-memory-client@example.com',
      clientId: client.id,
      status: 'confirmed',
    }, [{ serviceId: 1, serviceName: 'Haircut', durationMinutes: 45, priceSummary: '15,000 ֏' }]);

    const result = await cancelBookingByClient({
      referenceNumber,
      clientEmail: 'cancelled-memory-client@example.com',
      reason: 'Plans changed',
    });

    expect(result.cancelled).toBe(true);
    const memory = await getClientMemory(client.id);
    expect(memory?.visits.some(visit => visit.status === 'cancelled')).toBe(true);
    expect(memory?.events.some(event => event.eventType === 'cancelled' && event.note === 'Plans changed')).toBe(true);
  });
});
