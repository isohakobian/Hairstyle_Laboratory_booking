import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const services = [
  {
    nameEn: "Men's Haircut",
    nameRu: 'Мужская стрижка',
    descriptionEn: 'Professional haircut with precision fading and styling',
    descriptionRu: 'Профессиональная стрижка с точной техникой и стайлингом',
    durationMinutes: 45,
    priceRub: 3000,
    noteEn: null,
    noteRu: null,
  },
  {
    nameEn: 'Beard Modeling',
    nameRu: 'Моделирование бороды',
    descriptionEn: 'Expert beard shaping and grooming',
    descriptionRu: 'Экспертная формовка и уход за бородой',
    durationMinutes: 30,
    priceRub: 2500,
    noteEn: null,
    noteRu: null,
  },
  {
    nameEn: 'Scalp Care',
    nameRu: 'Уход за кожей головы',
    descriptionEn: 'Therapeutic scalp treatment and massage',
    descriptionRu: 'Терапевтическое лечение кожи головы и массаж',
    durationMinutes: 15,
    priceRub: 1200,
    noteEn: null,
    noteRu: null,
  },
  {
    nameEn: 'Hair Care',
    nameRu: 'Уход за волосами',
    descriptionEn: 'Deep conditioning and hair treatment',
    descriptionRu: 'Глубокое кондиционирование и лечение волос',
    durationMinutes: 15,
    priceRub: 1000,
    noteEn: null,
    noteRu: null,
  },
  {
    nameEn: 'Chemical Bio Perm',
    nameRu: 'Химическая биозавивка',
    descriptionEn: 'Professional chemical treatment for permanent waves',
    descriptionRu: 'Профессиональное химическое лечение для перманентных волн',
    durationMinutes: 240,
    priceRub: 12500,
    noteEn: 'A 5,000 RUB prepayment is required for chemical bio perm booking. Final price: 10,000–15,000 RUB.',
    noteRu: 'Для записи на химическую биозавивку требуется предоплата 5 000 ₽. Итоговая стоимость: 10 000–15 000 ₽.',
  },
  {
    nameEn: 'Consultation',
    nameRu: 'Консультация',
    descriptionEn: 'Free consultation for hair and style advice',
    descriptionRu: 'Бесплатная консультация по волосам и стилю',
    durationMinutes: 10,
    priceRub: 0,
    noteEn: null,
    noteRu: null,
  },
];

try {
  // Clear existing services
  await connection.execute('DELETE FROM services');
  
  // Insert new services
  for (const service of services) {
    await connection.execute(
      'INSERT INTO services (nameEn, nameRu, descriptionEn, descriptionRu, durationMinutes, priceRub, noteEn, noteRu) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        service.nameEn,
        service.nameRu,
        service.descriptionEn,
        service.descriptionRu,
        service.durationMinutes,
        service.priceRub,
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
