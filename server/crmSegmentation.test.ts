import { afterAll, describe, expect, it } from 'vitest';
import { getCrmRecipients, saveClientCrmPreference, createBookingWithServices, getBookingByReference } from './db';
import { completeBooking, findOrCreateClient } from './clientMemory';
import { clearExampleTestBookings } from './testCleanup';

describe('CRM service segmentation', () => {
  afterAll(async () => {
    await clearExampleTestBookings();
  });

  it('targets consenting clients with a completed booking for the selected service only', async () => {
    const haircutClient = await findOrCreateClient({ name: 'Haircut Segment Client', phone: '+37455000121', email: 'haircut-segment@example.com' });
    const beardClient = await findOrCreateClient({ name: 'Beard Segment Client', phone: '+37455000122', email: 'beard-segment@example.com' });
    const pendingClient = await findOrCreateClient({ name: 'Pending Segment Client', phone: '+37455000123', email: 'pending-segment@example.com' });
    await Promise.all([
      saveClientCrmPreference(haircutClient.id, 'yes'),
      saveClientCrmPreference(beardClient.id, 'yes'),
      saveClientCrmPreference(pendingClient.id, 'yes'),
    ]);

    const createSegmentBooking = async (referenceNumber: string, clientId: number, clientName: string, clientPhone: string, clientEmail: string, serviceId: number, serviceName: string, bookingTime: string) => {
      await createBookingWithServices({
        referenceNumber,
        serviceId,
        serviceName,
        serviceSummary: serviceName,
        totalDurationMinutes: 45,
        totalPriceSummary: '15,000 ֏',
        bookingDate: '2099-11-14',
        bookingTime,
        clientName,
        clientPhone,
        clientEmail,
        clientId,
        status: 'confirmed',
      }, [{ serviceId, serviceName, durationMinutes: 45, priceSummary: '15,000 ֏' }]);
    };

    const haircutReference = `SEG${Date.now().toString(36)}A`.slice(0, 12).toUpperCase();
    const beardReference = `SEG${Date.now().toString(36)}B`.slice(0, 12).toUpperCase();
    const pendingReference = `SEG${Date.now().toString(36)}C`.slice(0, 12).toUpperCase();
    await createSegmentBooking(haircutReference, haircutClient.id, 'Haircut Segment Client', '+37455000121', 'haircut-segment@example.com', 1, 'Haircut', '10:00');
    await createSegmentBooking(beardReference, beardClient.id, 'Beard Segment Client', '+37455000122', 'beard-segment@example.com', 2, 'Beard Modeling', '12:00');
    await createSegmentBooking(pendingReference, pendingClient.id, 'Pending Segment Client', '+37455000123', 'pending-segment@example.com', 1, 'Haircut', '14:00');

    const haircutBooking = await getBookingByReference(haircutReference);
    const beardBooking = await getBookingByReference(beardReference);
    if (!haircutBooking || !beardBooking) throw new Error('Segment test bookings were not created');
    await completeBooking(haircutBooking.id, 15000, '');
    await completeBooking(beardBooking.id, 12000, '');

    const recipients = await getCrmRecipients('specific_service', 1);
    expect(recipients.map(client => client.email)).toContain('haircut-segment@example.com');
    expect(recipients.map(client => client.email)).not.toContain('beard-segment@example.com');
    expect(recipients.map(client => client.email)).not.toContain('pending-segment@example.com');
  });
});
