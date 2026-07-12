import { validateCategoryConfig } from '../mercado-livre/category-url.js';
import { env } from '../config/env.js';
import { prisma } from '../database/client.js';

const total = await prisma.offer.count();
const pending = await prisma.offer.count({ where: { sentAt: null } });
const sent = await prisma.offer.count({ where: { sentAt: { not: null } } });
const latest = await prisma.offer.findMany({
  take: 5,
  orderBy: { createdAt: 'desc' },
  select: { title: true, score: true, sentAt: true, createdAt: true },
});

const categoryChecks = env.ML_CATEGORIES.map((category) => ({
  category,
  ...validateCategoryConfig(category),
}));

console.log(
  JSON.stringify(
    {
      categories: categoryChecks,
      offers: { total, pending, sent, latest },
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
