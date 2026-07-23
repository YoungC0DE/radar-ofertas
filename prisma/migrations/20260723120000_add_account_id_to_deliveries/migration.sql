-- AlterTable: add account_id with default to OfferDelivery
ALTER TABLE "offer_deliveries" ADD COLUMN "account_id" TEXT NOT NULL DEFAULT 'default';

-- Drop old unique index and create new one with account_id
DROP INDEX IF EXISTS "offer_deliveries_offer_id_channel_key";
CREATE UNIQUE INDEX "offer_deliveries_offer_id_channel_account_id_key" ON "offer_deliveries"("offer_id", "channel", "account_id");

-- CreateIndex
CREATE INDEX "offer_deliveries_account_id_channel_sent_at_idx" ON "offer_deliveries"("account_id", "channel", "sent_at");
