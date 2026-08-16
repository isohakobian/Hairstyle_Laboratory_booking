import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.execute("ALTER TABLE `bookings` ADD COLUMN IF NOT EXISTS `referencePhotoKey` varchar(500)");
    await connection.execute("ALTER TABLE `bookings` ADD COLUMN IF NOT EXISTS `referencePhotoFileName` varchar(255)");
    await connection.execute("ALTER TABLE `bookings` ADD COLUMN IF NOT EXISTS `referencePhotoMimeType` varchar(100)");
    console.log("Reference photo columns added successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
