-- AlterTable: add account_id with default to OfferDelivery
ALTER TABLE "offer_deliveries" ADD COLUMN "account_id" TEXT NOT NULL DEFAULT 'default';

-- Drop old unique constraint and create new one with account_id
ALTER TABLE "offer_deliveries" DROP CONSTRAINT "offer_deliveries_offer_id_channel_key";
ALTER TABLE "offer_deliveries" ADD CONSTRAINT "offer_deliveries_offer_id_channel_account_id_key" UNIQUE ("offer_id", "channel", "account_id");

-- CreateIndex
CREATE INDEX "offer_deliveries_account_id_channel_sent_at_idx" ON "offer_deliveries"("account_id", "channel", "sent_at");
