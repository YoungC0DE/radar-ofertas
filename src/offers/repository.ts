import type { Offer as PrismaOffer, OfferDelivery as PrismaOfferDelivery } from '@prisma/client';
import type { Channel } from '../channels/types.js';
import { env } from '../config/env.js';
import { prisma } from '../database/client.js';
import { nowInTimezone } from '../utils/datetime.js';
import type { CreateOfferInput, DeliveryRecord, OfferRecord } from './types.js';

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

/** Id da oferta com este mercadoLivreId, ou null. Usado para topar entregas
 * faltantes quando o mesmo produto reaparece na coleta de outro canal. */
export async function findOfferIdByMercadoLivreId(mercadoLivreId: string): Promise<string | null> {
  const offer = await prisma.offer.findUnique({
    where: { mercadoLivreId },
    select: { id: true },
  });
  return offer?.id ?? null;
}

/** Canais que já têm registro de entrega (pendente ou enviada) para a oferta. */
export async function findExistingDeliveryChannels(offerId: string): Promise<Channel[]> {
  const rows = await prisma.offerDelivery.findMany({
    where: { offerId },
    select: { channel: true },
  });
  return rows.map((row) => row.channel as Channel);
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

// --- Entregas por canal -------------------------------------------------------

function toDeliveryRecord(delivery: PrismaOfferDelivery): DeliveryRecord {
  return {
    id: delivery.id,
    offerId: delivery.offerId,
    channel: delivery.channel as Channel,
    sentAt: delivery.sentAt,
    messageId: delivery.messageId,
    error: delivery.error,
    createdAt: delivery.createdAt,
  };
}

/**
 * Abre (ou reabre) a entrega pendente de um canal. Chamado no enfileiramento —
 * a linha com sentAt nulo é o registro de "esta oferta deve ir para este canal".
 * Idempotente: reenfileirar limpa o erro anterior sem apagar um envio concluído.
 */
export async function openOfferDelivery(offerId: string, channel: Channel): Promise<void> {
  await prisma.offerDelivery.upsert({
    where: { offerId_channel: { offerId, channel } },
    update: { error: null },
    create: { offerId, channel },
  });
}

/**
 * Fecha a entrega como enviada e denormaliza o primeiro envio em Offer.sentAt.
 * As duas escritas vão numa transação: o dedup por título+preço lê Offer.sentAt,
 * então ele nunca pode divergir das entregas.
 */
export async function markOfferDelivered(
  offerId: string,
  channel: Channel,
  messageId: string,
): Promise<void> {
  const sentAt = nowInTimezone(env.APP_TIMEZONE);

  await prisma.$transaction([
    prisma.offerDelivery.upsert({
      where: { offerId_channel: { offerId, channel } },
      update: { sentAt, messageId, error: null },
      create: { offerId, channel, sentAt, messageId },
    }),
    // Só o primeiro canal a concluir grava — updateMany com sentAt: null evita
    // sobrescrever a marca de um canal que publicou antes.
    prisma.offer.updateMany({
      where: { id: offerId, sentAt: null },
      data: { sentAt },
    }),
  ]);
}

/** Registra a falha na entrega do canal, preservando o motivo para o painel. */
export async function markOfferDeliveryFailed(
  offerId: string,
  channel: Channel,
  error: string,
): Promise<void> {
  await prisma.offerDelivery.upsert({
    where: { offerId_channel: { offerId, channel } },
    update: { error: error.slice(0, 500) },
    create: { offerId, channel, error: error.slice(0, 500) },
  });
}

export async function findDelivery(offerId: string, channel: Channel): Promise<DeliveryRecord | null> {
  const delivery = await prisma.offerDelivery.findUnique({
    where: { offerId_channel: { offerId, channel } },
  });
  return delivery ? toDeliveryRecord(delivery) : null;
}

export async function findDeliveriesByOffer(offerId: string): Promise<DeliveryRecord[]> {
  const deliveries = await prisma.offerDelivery.findMany({
    where: { offerId },
    orderBy: { channel: 'asc' },
  });
  return deliveries.map(toDeliveryRecord);
}

/** Entregas de várias ofertas de uma vez — evita N+1 nas listagens do painel. */
export async function findDeliveriesByOfferIds(
  offerIds: string[],
): Promise<Map<string, DeliveryRecord[]>> {
  if (offerIds.length === 0) return new Map();

  const deliveries = await prisma.offerDelivery.findMany({
    where: { offerId: { in: offerIds } },
    orderBy: { channel: 'asc' },
  });

  const byOffer = new Map<string, DeliveryRecord[]>();
  for (const delivery of deliveries) {
    const list = byOffer.get(delivery.offerId) ?? [];
    list.push(toDeliveryRecord(delivery));
    byOffer.set(delivery.offerId, list);
  }
  return byOffer;
}

export async function offerWasSentTo(offerId: string, channel: Channel): Promise<boolean> {
  const count = await prisma.offerDelivery.count({
    where: { offerId, channel, sentAt: { not: null } },
  });
  return count > 0;
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

export interface ChannelStats {
  channel: Channel;
  /** Entregas concluídas neste canal. */
  sent: number;
  /** Enfileiradas e ainda não concluídas. */
  pending: number;
  /** Pendentes cuja última tentativa falhou. */
  failed: number;
  lastSentAt: Date | null;
}

export async function getChannelStats(channel: Channel): Promise<ChannelStats> {
  const [sent, pending, failed, last] = await Promise.all([
    prisma.offerDelivery.count({ where: { channel, sentAt: { not: null } } }),
    prisma.offerDelivery.count({ where: { channel, sentAt: null } }),
    prisma.offerDelivery.count({ where: { channel, sentAt: null, error: { not: null } } }),
    prisma.offerDelivery.findFirst({
      where: { channel, sentAt: { not: null } },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    }),
  ]);

  return { channel, sent, pending, failed, lastSentAt: last?.sentAt ?? null };
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
