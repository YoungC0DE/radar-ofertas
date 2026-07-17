-- CreateTable
CREATE TABLE "offer_deliveries" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "message_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offer_deliveries_offer_id_channel_key" ON "offer_deliveries"("offer_id", "channel");

-- CreateIndex
CREATE INDEX "offer_deliveries_channel_sent_at_idx" ON "offer_deliveries"("channel", "sent_at");

-- AddForeignKey
ALTER TABLE "offer_deliveries" ADD CONSTRAINT "offer_deliveries_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: todo envio existente foi feito pelo WhatsApp (único canal até aqui).
-- Sem isso, ofertas já publicadas apareceriam como pendentes para o canal.
INSERT INTO "offer_deliveries" ("id", "offer_id", "channel", "sent_at", "created_at")
SELECT
    md5(random()::text || clock_timestamp()::text || "id"),
    "id",
    'whatsapp',
    "sent_at",
    "sent_at"
FROM "offers"
WHERE "sent_at" IS NOT NULL;
