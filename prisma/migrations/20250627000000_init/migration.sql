-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "mercado_livre_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "old_price" DECIMAL(12,2),
    "discount" INTEGER,
    "image" TEXT,
    "affiliate_link" TEXT,
    "rating" DOUBLE PRECISION,
    "sold_quantity" INTEGER,
    "score" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offers_mercado_livre_id_key" ON "offers"("mercado_livre_id");
