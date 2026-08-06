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
    priceRub: null,
    priceMinRub: null,
    priceMaxRub: null,
    noteEn: '15,000 ֏',
    noteRu: '15,000 ֏',
  },
  {
    nameEn: 'Beard Modeling',
    nameRu: 'Моделирование бороды',
    descriptionEn: 'Beard shaping and grooming',
    descriptionRu: 'Формовка и уход за бородой',
    durationMinutes: 30,
    priceRub: null,
    priceMinRub: null,
    priceMaxRub: null,
    noteEn: '12,000 ֏',
    noteRu: '12,000 ֏',
  },
  {
    nameEn: 'Bio Perm',
    nameRu: 'Биохимическая завивка',
    descriptionEn: 'Chemical wave treatment with care',
    descriptionRu: 'Химическая завивка с уходом',
    durationMinutes: 180,
    priceRub: null,
    priceMinRub: null,
    priceMaxRub: null,
    noteEn: '70,000 – 110,000 ֏ (deposit: 35,000 ֏)',
    noteRu: '70,000 – 110,000 ֏ (предоплата: 35,000 ֏)',
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
