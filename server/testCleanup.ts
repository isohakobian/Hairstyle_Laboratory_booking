import { sql } from "drizzle-orm";
import { getDb } from "./db";

/** Removes only records created by automated tests, never real client data. */
export async function clearExampleTestBookings() {
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    DELETE r FROM reviews AS r
    INNER JOIN bookings AS b ON b.id = r.bookingId
    WHERE b.clientEmail LIKE '%@example.com'
  `);
  await db.execute(sql`
    DELETE rt FROM reviewTokens AS rt
    INNER JOIN bookings AS b ON b.id = rt.bookingId
    WHERE b.clientEmail LIKE '%@example.com'
  `);
  await db.execute(sql`
    DELETE be FROM bookingEvents AS be
    INNER JOIN bookings AS b ON b.id = be.bookingId
    WHERE b.clientEmail LIKE '%@example.com'
  `);
  await db.execute(sql`
    DELETE vm FROM visitMedia AS vm
    INNER JOIN bookings AS b ON b.id = vm.bookingId
    WHERE b.clientEmail LIKE '%@example.com'
  `);
  await db.execute(sql`
    DELETE rrh FROM reviewRequestHistory AS rrh
    INNER JOIN bookings AS b ON b.id = rrh.bookingId
    WHERE b.clientEmail LIKE '%@example.com'
  `);
  await db.execute(sql`DELETE FROM bookingStatusRecoveryTokens WHERE clientEmail LIKE '%@example.com'`);
  await db.execute(sql`
    DELETE bs FROM bookingServices AS bs
    INNER JOIN bookings AS b ON b.id = bs.bookingId
    WHERE b.clientEmail LIKE '%@example.com'
  `);
  await db.execute(sql`DELETE FROM bookings WHERE clientEmail LIKE '%@example.com'`);
  await db.execute(sql`DELETE FROM clients WHERE email LIKE '%@example.com'`);
  await db.execute(sql`DELETE FROM availabilityWindows WHERE date LIKE '2099-%'`);
  await db.execute(sql`DELETE FROM blockedDates WHERE date LIKE '2099-%'`);
}
