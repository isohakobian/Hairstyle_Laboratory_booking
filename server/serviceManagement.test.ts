import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { TrpcContext } from './_core/context';
import { appRouter } from './routers';
import { getDb } from './db';
import { services } from '../drizzle/schema';

function context(role: 'user' | 'admin' | null): TrpcContext {
  return {
    user: role ? {
      id: role === 'admin' ? 1 : 2,
      openId: `service-test-${role}`,
      email: `${role}@example.com`,
      name: role,
      loginMethod: 'test',
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } : null,
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('service management', () => {
  let serviceId: number | null = null;

  afterAll(async () => {
    if (!serviceId) return;
    const db = await getDb();
    if (db) await db.delete(services).where(eq(services.id, serviceId));
  });

  it('creates, edits, and archives a service without exposing archived entries to clients', async () => {
    const admin = appRouter.createCaller(context('admin'));
    const publicCaller = appRouter.createCaller(context(null));
    const created = await admin.admin.saveService({
      nameRu: 'Тестовая услуга', nameEn: 'Test service', descriptionRu: 'Для теста', descriptionEn: 'For test',
      durationMinutes: 50, priceAmd: 19000, priceMinAmd: null, priceMaxAmd: null, depositAmd: null,
      noteRu: null, noteEn: null, isActive: 'yes', displayOrder: 999,
    });
    serviceId = created.id;

    expect((await publicCaller.services.list()).some(service => service.id === serviceId)).toBe(true);

    // Test creating grey camouflage services for hair and beard at 5,500 AMD
    const camHair = await admin.admin.saveService({
      nameRu: 'Камуфляж седины · Волосы', nameEn: 'Grey Camouflage · Hair', descriptionRu: 'Деликатное тонирование седины волос', descriptionEn: 'Subtle hair grey blending',
      durationMinutes: 30, priceAmd: 5500, priceMinAmd: null, priceMaxAmd: null, depositAmd: null,
      noteRu: null, noteEn: null, isActive: 'yes', displayOrder: 10,
    });
    const camBeard = await admin.admin.saveService({
      nameRu: 'Камуфляж седины · Борода', nameEn: 'Grey Camouflage · Beard', descriptionRu: 'Деликатное тонирование седины бороды', descriptionEn: 'Subtle beard grey blending',
      durationMinutes: 30, priceAmd: 5500, priceMinAmd: null, priceMaxAmd: null, depositAmd: null,
      noteRu: null, noteEn: null, isActive: 'yes', displayOrder: 11,
    });

    const publicList = await publicCaller.services.list();
    expect(publicList.some(s => s.id === camHair.id && s.priceAmd === 5500)).toBe(true);
    expect(publicList.some(s => s.id === camBeard.id && s.priceAmd === 5500)).toBe(true);

    const db = await getDb();
    if (db) {
      await db.delete(services).where(eq(services.id, camHair.id));
      await db.delete(services).where(eq(services.id, camBeard.id));
    }

    await admin.admin.saveService({
      id: serviceId, nameRu: 'Тестовая услуга', nameEn: 'Test service', descriptionRu: 'Для теста', descriptionEn: 'For test',
      durationMinutes: 60, priceAmd: null, priceMinAmd: 18000, priceMaxAmd: 25000, depositAmd: 5000,
      noteRu: null, noteEn: null, isActive: 'no', displayOrder: 998,
    });

    const adminService = (await admin.admin.services()).find(service => service.id === serviceId);
    expect(adminService).toMatchObject({ isActive: 'no', durationMinutes: 60, priceMinAmd: 18000, priceMaxAmd: 25000, depositAmd: 5000 });
    expect((await publicCaller.services.list()).some(service => service.id === serviceId)).toBe(false);

    await admin.admin.setServiceActive({ id: serviceId, isActive: 'yes' });
    expect((await publicCaller.services.list()).some(service => service.id === serviceId)).toBe(true);
  });
});
