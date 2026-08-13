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
    DELETE bs FROM bookingServices AS bs
    INNER JOIN bookings AS b ON b.id = bs.bookingId
    WHERE b.clientEmail LIKE '%@example.com'
  `);
  await db.execute(sql`DELETE FROM bookings WHERE clientEmail LIKE '%@example.com'`);
}
