import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import { createBooking, createBookingStatusRecoveryToken, getBookingByReference } from './db';
import { clearExampleTestBookings } from './testCleanup';
import { setAvailabilityForDates } from './availability';
import { createReviewTokenValue, hashReviewToken } from './reviewToken';

const sendBookingStatusRecoveryEmailMock = vi.hoisted(() => vi.fn());
const storeManualDepositReceiptMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  storageKey: 'private/test-receipt.png',
  fileName: 'receipt.png',
  mimeType: 'image/png' as const,
  content: Buffer.from('receipt'),
}));

vi.mock('./bookingEmail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./bookingEmail')>();
  return { ...actual, sendBookingStatusRecoveryEmail: sendBookingStatusRecoveryEmailMock };
});

vi.mock('./manualDeposit', () => ({
  storeManualDepositReceipt: storeManualDepositReceiptMock,
  getManualDepositReceiptUrl: vi.fn(),
}));

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
  let bioPermServiceId: number;

  beforeAll(async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
    const services = await caller.services.list();
    haircutServiceId = services.find((service) => service.nameEn === 'Haircut')?.id ?? 0;
    beardServiceId = services.find((service) => service.nameEn === 'Beard Modeling')?.id ?? 0;
    bioPermServiceId = services.find((service) => service.nameEn === 'Bio Perm')?.id ?? 0;
    if (!haircutServiceId || !beardServiceId || !bioPermServiceId) throw new Error('Required services are unavailable');
    await setAvailabilityForDates(['2099-12-15', '2099-12-16', '2099-12-17', '2099-12-20', '2099-12-21', '2099-12-27', '2099-12-29'], '09:00', '19:00', 30);
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
        policyAccepted: true,
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
        policyAccepted: true,
      };

      const bookingData2 = {
        serviceIds: [beardServiceId],
        bookingDate: '2099-12-15',
        bookingTime: '16:00',
        clientName: 'Bob Smith',
        clientPhone: '+1234567892',
        clientEmail: 'bob@example.com',
        policyAccepted: true,
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
        policyAccepted: true,
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

  describe('bookings.recoverStatus', () => {
    it('sends a one-time email link and reveals only safe booking fields when that link is redeemed', async () => {
      const email = 'recovery-client@example.com';
      await createBooking({
        referenceNumber: 'RECOVER01', serviceId: haircutServiceId, serviceName: 'Haircut', serviceSummary: 'Haircut',
        totalDurationMinutes: 60, totalPriceSummary: '15,000 ֏', bookingDate: '2099-12-21', bookingTime: '11:00',
        clientName: 'Recovery Client', clientPhone: '+37455000123', clientEmail: email, status: 'pending',
      });

      sendBookingStatusRecoveryEmailMock.mockClear();
      await expect(caller.bookings.requestStatusRecovery({ clientEmail: email })).resolves.toEqual({ success: true });
      expect(sendBookingStatusRecoveryEmailMock).toHaveBeenCalledTimes(1);
      const recoveryUrl = sendBookingStatusRecoveryEmailMock.mock.calls[0]?.[1] as string;
      const token = new URL(recoveryUrl).searchParams.get('recovery');
      expect(token).toBeTruthy();

      const recovered = await caller.bookings.recoverStatus({ token: token! });
      expect(recovered).toEqual(expect.arrayContaining([expect.objectContaining({ referenceNumber: 'RECOVER01' })]));
      expect(recovered[0]).not.toHaveProperty('clientEmail');
      expect(recovered[0]).not.toHaveProperty('clientPhone');
      await expect(caller.bookings.recoverStatus({ token: token! })).rejects.toThrow(/invalid, expired, or already used/i);
    });

    it('always returns a generic response and rejects expired tokens', async () => {
      sendBookingStatusRecoveryEmailMock.mockClear();
      await expect(caller.bookings.requestStatusRecovery({ clientEmail: 'no-booking@example.com' })).resolves.toEqual({ success: true });
      expect(sendBookingStatusRecoveryEmailMock).not.toHaveBeenCalled();

      const expiredToken = createReviewTokenValue();
      await createBookingStatusRecoveryToken('recovery-client@example.com', hashReviewToken(expiredToken), new Date(Date.now() - 60_000));
      await expect(caller.bookings.recoverStatus({ token: expiredToken })).rejects.toThrow(/invalid, expired, or already used/i);
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
        policyAccepted: true,
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
        policyAccepted: true,
      })).rejects.toThrow('Each service can only be selected once');
    });

    it('blocks every overlapping slot for the complete duration of a combined visit', async () => {
      const date = '2099-12-20';
      const combined = await caller.bookings.create({
        serviceIds: [haircutServiceId, beardServiceId],
        bookingDate: date,
        bookingTime: '10:00',
        clientName: 'Interval Client',
        clientPhone: '+37455000003',
        clientEmail: 'interval-client@example.com',
        policyAccepted: true,
      });
      expect(combined.totalDurationMinutes).toBeGreaterThan(60);

      await expect(caller.bookings.create({
        serviceIds: [haircutServiceId],
        bookingDate: date,
        bookingTime: '10:30',
        clientName: 'Overlapping Client',
        clientPhone: '+37455000004',
        clientEmail: 'overlap-client@example.com',
        policyAccepted: true,
      })).rejects.toThrow(/not available/i);

      const remainingSlots = await caller.availability.slots({ date, durationMinutes: 30 });
      expect(remainingSlots).not.toContain('10:30');
      expect(remainingSlots).toContain('12:00');
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

    it('should expose review-request statistics for admin', async () => {
      const adminCaller = appRouter.createCaller(createMockContext(1, 'admin'));

      const dashboard = await adminCaller.admin.reviewRequests();

      expect(dashboard.stats.sent).toBeGreaterThanOrEqual(0);
      expect(dashboard.stats.received).toBeGreaterThanOrEqual(0);
      expect(dashboard.stats.awaiting).toBeGreaterThanOrEqual(0);
      expect(dashboard.stats.sent).toBe(dashboard.stats.received + dashboard.stats.awaiting);
      expect(Array.isArray(dashboard.items)).toBe(true);
    });

    it('should permanently delete an unnecessary booking as admin', async () => {
      const adminCaller = appRouter.createCaller(createMockContext(1, 'admin'));
      const referenceNumber = `TX${Date.now().toString(36)}`.slice(0, 12).toUpperCase();
      await createBooking({
        referenceNumber,
        serviceId: 1,
        serviceName: 'Haircut',
        bookingDate: '2099-12-22',
        bookingTime: '11:00',
        clientName: 'Delete Test',
        clientPhone: '+1234567897',
        clientEmail: 'delete-test@example.com',
        status: 'pending',
      });
      const created = await getBookingByReference(referenceNumber);
      if (!created) throw new Error('Test booking was not created');

      await expect(adminCaller.admin.deleteBooking({ id: created.id })).resolves.toMatchObject({ success: true });
      await expect(caller.bookings.getByReference({ referenceNumber })).resolves.toBeUndefined();
    });

    it('requires a receipt for a deposit booking and blocks confirmation until Isaac verifies it', async () => {
      const adminCaller = appRouter.createCaller(createMockContext(99, 'admin'));
      await adminCaller.admin.saveManualDepositSettings({
        recipientName: 'Isaac Hakobian', cardDetails: '0000 0000 0000 0000', isEnabled: 'yes',
        policyRu: 'Политика отмены', policyEn: 'Cancellation policy',
      });
      const base = {
        serviceIds: [bioPermServiceId], bookingDate: '2099-12-29', bookingTime: '09:00',
        clientName: 'Deposit Client', clientPhone: '+37455000999', clientEmail: 'deposit@example.com',
      };
      await expect(caller.bookings.create(base)).rejects.toThrow(/cancellation policy/i);
      await expect(caller.bookings.create({ ...base, policyAccepted: true })).rejects.toThrow(/payment receipt/i);

      storeManualDepositReceiptMock.mockClear();
      const booking = await caller.bookings.create({
        ...base,
        policyAccepted: true,
        receipt: { fileName: 'receipt.png', mimeType: 'image/png', base64Data: 'cmVjZWlwdA==' },
      });
      expect(storeManualDepositReceiptMock).toHaveBeenCalledTimes(1);
      expect(booking.manualDepositAmountAmd).toBe(35000);
      expect(booking.manualDepositStatus).toBe('proof_received');
      expect(booking.manualDepositReceiptKey).toBe('private/test-receipt.png');

      await expect(adminCaller.admin.confirmBooking({ id: booking.id })).rejects.toThrow(/verify the manual deposit/i);
      await adminCaller.admin.updateManualDepositStatus({ id: booking.id, status: 'verified' });
      await expect(adminCaller.admin.confirmBooking({ id: booking.id })).resolves.toEqual({ success: true });

      const invalidReceiptBooking = await caller.bookings.create({
        ...base,
        bookingTime: '13:00',
        clientName: 'Invalid Receipt Client',
        clientPhone: '+37455000888',
        clientEmail: 'invalid-receipt@example.com',
        policyAccepted: true,
        receipt: { fileName: 'invalid.png', mimeType: 'image/png', base64Data: 'cmVjZWlwdA==' },
      });
      await expect(adminCaller.admin.declineBookingForInvalidReceipt({ id: invalidReceiptBooking.id })).resolves.toEqual({ success: true });
      const rejected = await caller.bookings.getByReference({ referenceNumber: invalidReceiptBooking.referenceNumber });
      expect(rejected?.status).toBe('declined');
      expect(rejected?.manualDepositStatus).toBe('waived');

      const cancellable = await caller.bookings.create({
        serviceIds: [haircutServiceId], bookingDate: '2099-12-29', bookingTime: '17:00',
        clientName: 'Cancellation Client', clientPhone: '+37455000777', clientEmail: 'cancel@example.com', policyAccepted: true,
      });
      await expect(caller.bookings.cancelByClient({ referenceNumber: cancellable.referenceNumber, clientEmail: 'other@example.com', reason: 'Plans changed' })).rejects.toThrow(/could not be cancelled/i);
      await expect(caller.bookings.cancelByClient({ referenceNumber: cancellable.referenceNumber, clientEmail: 'cancel@example.com', reason: 'Plans changed' })).resolves.toEqual({ success: true });
      const cancelled = await caller.bookings.getByReference({ referenceNumber: cancellable.referenceNumber });
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.cancellationReason).toBe('Plans changed');
      expect(await caller.availability.slots({ date: '2099-12-29', durationMinutes: 60 })).toContain('17:00');

      await adminCaller.admin.saveManualDepositSettings({
        recipientName: '', cardDetails: '', isEnabled: 'no', policyRu: 'Политика отмены', policyEn: 'Cancellation policy',
      });
    }, 20000);
  });
});
