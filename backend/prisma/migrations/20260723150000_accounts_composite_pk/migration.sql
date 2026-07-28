-- Permite o mesmo id (ex.: default) em plataformas distintas.
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_pkey";
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id", "platform");
