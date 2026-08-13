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
    priceAmd: 15000,
    priceMinAmd: null,
    priceMaxAmd: null,
    depositAmd: null,
    noteEn: '15,000 ֏',
    noteRu: '15,000 ֏',
  },
  {
    nameEn: 'Beard Modeling',
    nameRu: 'Моделирование бороды',
    descriptionEn: 'Beard shaping and grooming',
    descriptionRu: 'Формовка и уход за бородой',
    durationMinutes: 30,
    priceAmd: 12000,
    priceMinAmd: null,
    priceMaxAmd: null,
    depositAmd: null,
    noteEn: '12,000 ֏',
    noteRu: '12,000 ֏',
  },
  {
    nameEn: 'Bio Perm',
    nameRu: 'Биохимическая завивка',
    descriptionEn: 'Chemical wave treatment with care',
    descriptionRu: 'Химическая завивка с уходом',
    durationMinutes: 180,
    priceAmd: null,
    priceMinAmd: 70000,
    priceMaxAmd: 110000,
    depositAmd: 35000,
    noteEn: '70,000 – 110,000 ֏ (deposit: 35,000 ֏)',
    noteRu: '70,000 – 110,000 ֏ (предоплата: 35,000 ֏)',
  },
];

try {
  for (const service of services) {
    await connection.execute(
      `UPDATE services
       SET nameRu = ?, descriptionEn = ?, descriptionRu = ?, durationMinutes = ?,
           priceAmd = ?, priceMinAmd = ?, priceMaxAmd = ?, depositAmd = ?, noteEn = ?, noteRu = ?
       WHERE nameEn = ?`,
      [
        service.nameRu,
        service.descriptionEn,
        service.descriptionRu,
        service.durationMinutes,
        service.priceAmd,
        service.priceMinAmd,
        service.priceMaxAmd,
        service.depositAmd,
        service.noteEn,
        service.noteRu,
        service.nameEn,
      ],
    );
  }

  console.log('✓ Services seeded successfully');
  await connection.end();
} catch (error) {
  console.error('Error seeding services:', error);
  process.exit(1);
}
