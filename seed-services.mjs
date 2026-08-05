import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const services = [
  {
    nameEn: 'Haircut',
    nameRu: 'Стрижка',
    descriptionEn: 'Precision cut and styling',
    descriptionRu: 'Точная стрижка и стайлинг',
    durationMinutes: 45,
    priceRub: 3000,
    priceMinRub: null,
    priceMaxRub: null,
    noteEn: '3,000 RUB / 15,000 AMD',
    noteRu: '3 000 ₽ / 15 000 ֏',
  },
  {
    nameEn: 'Beard modeling',
    nameRu: 'Моделирование бороды',
    descriptionEn: 'Beard shaping and grooming',
    descriptionRu: 'Формовка и уход за бородой',
    durationMinutes: 30,
    priceRub: 500,
    priceMinRub: null,
    priceMaxRub: null,
    noteEn: '500 RUB / 2,500 AMD',
    noteRu: '500 ₽ / 2 500 ֏',
  },
];

try {
  // Clear existing services
  await connection.execute('DELETE FROM services');
  
  // Insert new services
  for (const service of services) {
    await connection.execute(
      'INSERT INTO services (nameEn, nameRu, descriptionEn, descriptionRu, durationMinutes, priceRub, priceMinRub, priceMaxRub, noteEn, noteRu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        service.nameEn,
        service.nameRu,
        service.descriptionEn,
        service.descriptionRu,
        service.durationMinutes,
        service.priceRub,
        service.priceMinRub,
        service.priceMaxRub,
        service.noteEn,
        service.noteRu,
      ]
    );
  }

  console.log('✓ Services seeded successfully');
  await connection.end();
} catch (error) {
  console.error('Error seeding services:', error);
  process.exit(1);
}
