import type { Offer as PrismaOffer } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../database/client.js';
import { nowInTimezone } from '../utils/datetime.js';
import type { CreateOfferInput, OfferRecord } from './types.js';

function toRecord(offer: PrismaOffer): OfferRecord {
  return {
    id: offer.id,
    mercadoLivreId: offer.mercadoLivreId,
    title: offer.title,
    price: Number(offer.price),
    oldPrice: offer.oldPrice ? Number(offer.oldPrice) : null,
    discount: offer.discount,
    image: offer.image,
    affiliateLink: offer.affiliateLink,
    rating: offer.rating,
    soldQuantity: offer.soldQuantity,
    score: offer.score,
    sentAt: offer.sentAt,
    createdAt: offer.createdAt,
  };
}

export async function offerExists(mercadoLivreId: string): Promise<boolean> {
  const count = await prisma.offer.count({ where: { mercadoLivreId } });
  return count > 0;
}

export async function createOffer(input: CreateOfferInput): Promise<OfferRecord> {
  const offer = await prisma.offer.create({
    data: {
      ...input,
      createdAt: nowInTimezone(env.APP_TIMEZONE),
    },
  });
  return toRecord(offer);
}

export async function findOfferById(id: string): Promise<OfferRecord | null> {
  const offer = await prisma.offer.findUnique({ where: { id } });
  return offer ? toRecord(offer) : null;
}

export async function markOfferSent(id: string): Promise<void> {
  await prisma.offer.update({
    where: { id },
    data: { sentAt: nowInTimezone(env.APP_TIMEZONE) },
  });
}
