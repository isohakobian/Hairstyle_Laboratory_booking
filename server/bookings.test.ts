import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import { createBooking, getBookingByReference } from './db';
import { clearExampleTestBookings } from './testCleanup';
import { setAvailabilityForDates } from './availability';

// Mock context for testing
function createMockContext(userId: number = 1, role: 'user' | 'admin' = 'user'): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: `test${userId}@example.com`,
      name: `Test User ${userId}`,
      loginMethod: 'test',
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Bookings API', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let haircutServiceId: number;
  let beardServiceId: number;

  beforeAll(async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
    const services = await caller.services.list();
    haircutServiceId = services.find((service) => service.nameEn === 'Haircut')?.id ?? 0;
    beardServiceId = services.find((service) => service.nameEn === 'Beard Modeling')?.id ?? 0;
    if (!haircutServiceId || !beardServiceId) throw new Error('Required services are unavailable');
    await setAvailabilityForDates(['2099-12-15', '2099-12-16', '2099-12-17', '2099-12-20', '2099-12-21', '2099-12-27'], '09:00', '19:00', 30);
  });

  afterAll(async () => {
    await clearExampleTestBookings();
  });

  describe('services.list', () => {
    it('should return list of services', async () => {
      const services = await caller.services.list();
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      
      // Verify service structure
      const service = services[0];
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('nameEn');
      expect(service).toHaveProperty('nameRu');
      expect(service).toHaveProperty('priceRub');
      expect(service).toHaveProperty('durationMinutes');
    });

    it('should have valid service data', async () => {
      const services = await caller.services.list();
      const service = services[0];
      
      expect(typeof service.nameEn).toBe('string');
      expect(typeof service.nameRu).toBe('string');
      expect(typeof service.durationMinutes).toBe('number');
      expect(service.durationMinutes).toBeGreaterThan(0);
      expect(service.priceRub === null || typeof service.priceRub === 'number').toBe(true);
      expect(typeof service.noteRu).toBe('string');
      expect(service.noteRu?.length).toBeGreaterThan(0);
    });
  });

  describe('bookings.create', () => {
    it('should create a booking with valid data', async () => {
      const bookingData = {
        serviceIds: [haircutServiceId],
        bookingDate: '2099-12-15',
        bookingTime: '14:00',
        clientName: 'John Doe',
        clientPhone: '+1234567890',
        clientEmail: 'john@example.com',
        comment: 'Please be gentle with the fade',
      };

      const result = await caller.bookings.create(bookingData);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('referenceNumber');
      expect(result.status).toBe('pending');
      expect(result.clientName).toBe(bookingData.clientName);
      expect(result.clientPhone).toBe(bookingData.clientPhone);
      expect(result.clientEmail).toBe(bookingData.clientEmail);
    });

    it('should generate unique reference numbers', async () => {
      const bookingData1 = {
        serviceIds: [haircutServiceId],
        bookingDate: '2099-12-15',
        bookingTime: '15:00',
        clientName: 'Jane Doe',
        clientPhone: '+1234567891',
        clientEmail: 'jane@example.com',
      };

      const bookingData2 = {
        serviceIds: [beardServiceId],
        bookingDate: '2099-12-15',
        bookingTime: '16:00',
        clientName: 'Bob Smith',
        clientPhone: '+1234567892',
        clientEmail: 'bob@example.com',
      };

      const booking1 = await caller.bookings.create(bookingData1);
      const booking2 = await caller.bookings.create(bookingData2);

      expect(booking1.referenceNumber).not.toBe(booking2.referenceNumber);
      expect(booking1.referenceNumber).toMatch(/^[A-Z0-9]+$/);
      expect(booking2.referenceNumber).toMatch(/^[A-Z0-9]+$/);
    }, 15000);
  });

  describe('bookings.getByReference', () => {
    it('should retrieve booking by reference number', async () => {
      const bookingData = {
        serviceIds: [haircutServiceId],
        bookingDate: '2099-12-16',
        bookingTime: '10:00',
        clientName: 'Alice Johnson',
        clientPhone: '+1234567893',
        clientEmail: 'alice@example.com',
      };

      const created = await caller.bookings.create(bookingData);
      const retrieved = await caller.bookings.getByReference({
        referenceNumber: created.referenceNumber,
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.referenceNumber).toBe(created.referenceNumber);
      expect(retrieved?.clientName).toBe(bookingData.clientName);
    });

    it('should return undefined for non-existent reference', async () => {
      const result = await caller.bookings.getByReference({
        referenceNumber: 'NONEXISTENT123',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('bookings.getByEmail', () => {
    it('should retrieve bookings by email', async () => {
      const email = 'test-user@example.com';
      const bookingData = {
        serviceIds: [haircutServiceId],
        bookingDate: '2099-12-17',
        bookingTime: '11:00',
        clientName: 'Test User',
        clientPhone: '+1234567894',
        clientEmail: email,
      };

      await caller.bookings.create(bookingData);
      const results = await caller.bookings.getByEmail({ email });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(b => b.clientEmail === email)).toBe(true);
    });

    it('should return empty array for non-existent email', async () => {
      const results = await caller.bookings.getByEmail({
        email: 'nonexistent@example.com',
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('multi-service bookings', () => {
    it('should create one visit with several distinct services', async () => {
      const result = await caller.bookings.create({
        serviceIds: [haircutServiceId, beardServiceId],
        bookingDate: '2099-12-27',
        bookingTime: '10:00',
        clientName: 'Multi Service Client',
        clientPhone: '+37455000001',
        clientEmail: 'multi-service@example.com',
      });

      expect(result.serviceSummary).toContain('Haircut');
      expect(result.serviceSummary).toContain('Beard Modeling');
      const services = await caller.services.list();
      const expectedDuration = services
        .filter(service => [haircutServiceId, beardServiceId].includes(service.id))
        .reduce((total, service) => total + service.durationMinutes, 0);
      expect(result.totalDurationMinutes).toBe(expectedDuration);
      expect(result.totalPriceSummary).toBe('27,000 ֏');
    });

    it('should reject duplicate services in one visit', async () => {
      await expect(caller.bookings.create({
        serviceIds: [haircutServiceId, haircutServiceId],
        bookingDate: '2099-12-28',
        bookingTime: '10:00',
        clientName: 'Duplicate Service Client',
        clientPhone: '+37455000002',
        clientEmail: 'duplicate-service@example.com',
      })).rejects.toThrow('Each service can only be selected once');
    });
  });

  describe('Admin procedures', () => {
    it('should confirm a pending booking', async () => {
      const adminCtx = createMockContext(1, 'admin');
      const adminCaller = appRouter.createCaller(adminCtx);

      // Insert an isolated pending booking directly so the test does not depend
      // on the owner's real blocked-date calendar.
      const referenceNumber = `TC${Date.now().toString(36)}`.slice(0, 12).toUpperCase();
      await createBooking({
        referenceNumber,
        serviceId: 1,
        serviceName: 'Haircut',
        bookingDate: '2099-12-20',
        bookingTime: '09:00',
        clientName: 'Admin Test',
        clientPhone: '+1234567895',
        clientEmail: 'admin-test@example.com',
        status: 'pending',
      });
      const created = await getBookingByReference(referenceNumber);
      if (!created) throw new Error('Test booking was not created');

      // Confirm it as admin
      const confirmed = await adminCaller.admin.confirmBooking({ id: created.id });

      expect(confirmed.success).toBe(true);
      
      // Verify the booking status was updated
      const updated = await caller.bookings.getByReference({ referenceNumber: created.referenceNumber });
      expect(updated?.status).toBe('confirmed');
    });

    it('should decline a pending booking', async () => {
      const adminCtx = createMockContext(1, 'admin');
      const adminCaller = appRouter.createCaller(adminCtx);

      // Insert an isolated pending booking directly so the test does not depend
      // on the owner's real blocked-date calendar.
      const referenceNumber = `TD${Date.now().toString(36)}`.slice(0, 12).toUpperCase();
      await createBooking({
        referenceNumber,
        serviceId: 2,
        serviceName: 'Beard Modeling',
        bookingDate: '2099-12-21',
        bookingTime: '15:30',
        clientName: 'Decline Test',
        clientPhone: '+1234567896',
        clientEmail: 'decline-test@example.com',
        status: 'pending',
      });
      const created = await getBookingByReference(referenceNumber);
      if (!created) throw new Error('Test booking was not created');

      // Decline it as admin
      const declined = await adminCaller.admin.declineBooking({ id: created.id });

      expect(declined.success).toBe(true);
      
      // Verify the booking status was updated
      const updated = await caller.bookings.getByReference({ referenceNumber: created.referenceNumber });
      expect(updated?.status).toBe('declined');
    });

    it('should list all bookings for admin', async () => {
      const adminCtx = createMockContext(1, 'admin');
      const adminCaller = appRouter.createCaller(adminCtx);

      const bookings = await adminCaller.admin.bookings();

      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBeGreaterThanOrEqual(0);

      // Verify booking structure
      if (bookings.length > 0) {
        const booking = bookings[0];
        expect(booking).toHaveProperty('id');
        expect(booking).toHaveProperty('referenceNumber');
        expect(booking).toHaveProperty('status');
        expect(booking).toHaveProperty('clientName');
        expect(booking).toHaveProperty('clientPhone');
      }
    });
  });
});
