-- Garante índices corretos para multi-conta (idempotente; corrige deploy parcial)
ALTER TABLE "offer_deliveries" ADD COLUMN IF NOT EXISTS "account_id" TEXT NOT NULL DEFAULT 'default';

DROP INDEX IF EXISTS "offer_deliveries_offer_id_channel_key";

CREATE UNIQUE INDEX IF NOT EXISTS "offer_deliveries_offer_id_channel_account_id_key"
  ON "offer_deliveries"("offer_id", "channel", "account_id");

CREATE INDEX IF NOT EXISTS "offer_deliveries_account_id_channel_sent_at_idx"
  ON "offer_deliveries"("account_id", "channel", "sent_at");
