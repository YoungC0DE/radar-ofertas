import { buildMlCategoryRows, hydrateMlSourcesCache } from '../config/ml-sources-config.js';
import { prisma } from '../database/client.js';

await hydrateMlSourcesCache();

const total = await prisma.offer.count();
const pending = await prisma.offer.count({ where: { sentAt: null } });
const sent = await prisma.offer.count({ where: { sentAt: { not: null } } });
const latest = await prisma.offer.findMany({
  take: 5,
  orderBy: { createdAt: 'desc' },
  select: { title: true, score: true, sentAt: true, createdAt: true },
});

const categoryChecks = buildMlCategoryRows();

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
