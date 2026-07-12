import { prisma } from '../database/client.js';

const result = await prisma.offer.deleteMany();
console.log(`deleted: ${result.count}`);
await prisma.$disconnect();
