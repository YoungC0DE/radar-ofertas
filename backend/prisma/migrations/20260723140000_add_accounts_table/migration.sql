-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_platform_enabled_idx" ON "accounts"("platform", "enabled");

-- Migrate legacy settings.accounts JSON blob (if present)
DO $$
DECLARE
  raw TEXT;
  elem JSONB;
BEGIN
  SELECT value INTO raw FROM settings WHERE key = 'accounts' LIMIT 1;
  IF raw IS NULL OR btrim(raw) = '' OR raw = '[]' THEN
    RETURN;
  END IF;

  FOR elem IN SELECT * FROM jsonb_array_elements(raw::jsonb)
  LOOP
    IF elem->>'id' IS NULL OR elem->>'platform' IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO accounts (id, platform, label, enabled, config, created_at)
    VALUES (
      elem->>'id',
      elem->>'platform',
      COALESCE(NULLIF(elem->>'label', ''), elem->>'id'),
      COALESCE((elem->>'enabled')::boolean, true),
      COALESCE(elem->'config', '{}'::jsonb),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  DELETE FROM settings WHERE key = 'accounts';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'accounts migration from settings skipped: %', SQLERRM;
END $$;
