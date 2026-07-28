-- CreateTable
CREATE TABLE "auto_messages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "schedule_type" TEXT NOT NULL DEFAULT 'manual',
    "scheduled_at" TIMESTAMP(3),
    "daily_hour" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_messages_pkey" PRIMARY KEY ("id")
);
