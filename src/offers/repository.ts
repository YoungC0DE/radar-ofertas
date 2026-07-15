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
    permalink: offer.permalink,
    affiliateLink: offer.affiliateLink,
    rating: offer.rating,
    soldQuantity: offer.soldQuantity,
    salesRank: offer.salesRank,
    seller: offer.seller,
    officialStore: offer.officialStore,
    bestSeller: offer.bestSeller,
    score: offer.score,
    sentAt: offer.sentAt,
    createdAt: offer.createdAt,
  };
}

export async function offerExists(mercadoLivreId: string): Promise<boolean> {
  const count = await prisma.offer.count({ where: { mercadoLivreId } });
  return count > 0;
}

export async function sentOfferExistsByTitleAndPrice(title: string, price: number): Promise<boolean> {
  const count = await prisma.offer.count({
    where: {
      title,
      price,
      sentAt: { not: null },
    },
  });
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

export async function updateOfferAffiliateLink(id: string, affiliateLink: string): Promise<void> {
  await prisma.offer.update({
    where: { id },
    data: { affiliateLink },
  });
}

export async function markOfferSent(id: string): Promise<void> {
  await prisma.offer.update({
    where: { id },
    data: { sentAt: nowInTimezone(env.APP_TIMEZONE) },
  });
}

export type OfferSentFilter = 'all' | 'pending' | 'sent';

export interface OfferStats {
  total: number;
  pending: number;
  sent: number;
}

export interface FindOffersOptions {
  sent?: OfferSentFilter;
  limit?: number;
  offset?: number;
}

function sentWhere(sent: OfferSentFilter = 'all') {
  if (sent === 'pending') return { sentAt: null };
  if (sent === 'sent') return { sentAt: { not: null } };
  return {};
}

export async function getOfferStats(): Promise<OfferStats> {
  const [total, pending, sent] = await Promise.all([
    prisma.offer.count(),
    prisma.offer.count({ where: { sentAt: null } }),
    prisma.offer.count({ where: { sentAt: { not: null } } }),
  ]);
  return { total, pending, sent };
}

export async function countOffers(sent: OfferSentFilter = 'all'): Promise<number> {
  return prisma.offer.count({ where: sentWhere(sent) });
}

export async function findOffers(options: FindOffersOptions = {}): Promise<OfferRecord[]> {
  const { sent = 'all', limit = 50, offset = 0 } = options;
  const orderBy =
    sent === 'sent'
      ? { sentAt: 'desc' as const }
      : sent === 'pending'
        ? { createdAt: 'asc' as const }
        : { createdAt: 'desc' as const };
  const offers = await prisma.offer.findMany({
    where: sentWhere(sent),
    orderBy,
    take: limit,
    skip: offset,
  });
  return offers.map(toRecord);
}

export async function findPendingOfferIds(): Promise<string[]> {
  const offers = await prisma.offer.findMany({
    where: { sentAt: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return offers.map((offer) => offer.id);
}

export async function deletePendingOffers(): Promise<number> {
  const result = await prisma.offer.deleteMany({ where: { sentAt: null } });
  return result.count;
}

/** Remove uma única oferta apenas se ela ainda estiver pendente (não enviada). */
export async function deletePendingOfferById(id: string): Promise<number> {
  const result = await prisma.offer.deleteMany({ where: { id, sentAt: null } });
  return result.count;
}

export async function findLastSentAt(): Promise<Date | null> {
  const offer = await prisma.offer.findFirst({
    where: { sentAt: { not: null } },
    orderBy: { sentAt: 'desc' },
    select: { sentAt: true },
  });
  return offer?.sentAt ?? null;
}
