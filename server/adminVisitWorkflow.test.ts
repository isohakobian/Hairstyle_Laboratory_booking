import { describe, expect, it, afterAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import { clearExampleTestBookings } from './testCleanup';
import { createBookingWithServices, getAllServices, getBookingByReference, getBookingServices } from './db';

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'admin-visit-workflow-test',
      email: 'admin@example.com',
      name: 'Isaac',
      loginMethod: 'test',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {} } as TrpcContext['res'],
  };
}

describe('Admin visit workflow', () => {
  afterAll(async () => {
    await clearExampleTestBookings();
  });

  it('changes services and recalculates duration and price without allowing overlap', async () => {
    const services = await getAllServices(true);
    const haircut = services.find(service => service.nameEn === 'Haircut');
    const beard = services.find(service => service.nameEn === 'Beard Modeling');
    if (!haircut || !beard) throw new Error('Required services are unavailable');

    const referenceNumber = `SV${Date.now().toString(36)}`.slice(0, 12).toUpperCase();
    const bookingId = await createBookingWithServices({
      referenceNumber,
      serviceId: haircut.id,
      serviceName: haircut.nameEn,
      serviceSummary: haircut.nameEn,
      totalDurationMinutes: haircut.durationMinutes,
      totalPriceSummary: `${haircut.priceAmd ?? 0} ֏`,
      bookingDate: '2099-12-31',
      bookingTime: '09:00',
      clientName: 'Service Change Client',
      clientPhone: '+37455000991',
      clientEmail: 'service-change@example.com',
      status: 'confirmed',
    }, [{
      serviceId: haircut.id,
      serviceName: haircut.nameEn,
      durationMinutes: haircut.durationMinutes,
      priceSummary: `${haircut.priceAmd ?? 0} ֏`,
    }]);

    const adminCaller = appRouter.createCaller(createAdminContext());
    const updated = await adminCaller.admin.updateBookingServices({ id: bookingId, serviceIds: [haircut.id, beard.id] });

    expect(updated.success).toBe(true);
    expect(updated.totalDurationMinutes).toBe(haircut.durationMinutes + beard.durationMinutes);
    expect(updated.serviceSummary).toContain(haircut.nameEn);
    expect(updated.serviceSummary).toContain(beard.nameEn);
    expect((await getBookingServices(bookingId)).map(service => service.serviceId)).toEqual([haircut.id, beard.id]);
    await expect(adminCaller.admin.updateBookingServices({ id: bookingId, serviceIds: [] })).rejects.toThrow();
  });

  it('moves a confirmed visit to completed after the visit is finished', async () => {
    const haircut = (await getAllServices(true)).find(service => service.nameEn === 'Haircut');
    if (!haircut) throw new Error('Haircut service is unavailable');

    const referenceNumber = `CP${Date.now().toString(36)}`.slice(0, 12).toUpperCase();
    const bookingId = await createBookingWithServices({
      referenceNumber,
      serviceId: haircut.id,
      serviceName: haircut.nameEn,
      serviceSummary: haircut.nameEn,
      totalDurationMinutes: haircut.durationMinutes,
      totalPriceSummary: `${haircut.priceAmd ?? 0} ֏`,
      bookingDate: '2099-12-30',
      bookingTime: '09:00',
      clientName: 'Completed Visit Client',
      clientPhone: '+37455000992',
      clientEmail: 'completed-visit@example.com',
      status: 'confirmed',
    }, [{
      serviceId: haircut.id,
      serviceName: haircut.nameEn,
      durationMinutes: haircut.durationMinutes,
      priceSummary: `${haircut.priceAmd ?? 0} ֏`,
    }]);

    const adminCaller = appRouter.createCaller(createAdminContext());
    await expect(adminCaller.admin.completeBooking({ id: bookingId, finalPriceAmd: 15000, note: 'Finished' })).resolves.toEqual({ success: true });

    const completed = await getBookingByReference(referenceNumber);
    expect(completed?.status).toBe('completed');
    expect(completed?.completedAt).toBeTruthy();
    expect(completed?.finalPriceAmd).toBe(15000);
  });
});
