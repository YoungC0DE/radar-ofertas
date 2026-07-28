-- Dados raspados do card do ML: .poly-component__seller (nome + svg "Loja oficial")
-- e .poly-component__poly-label com texto "MAIS VENDIDO".
ALTER TABLE "offers" ADD COLUMN "seller" TEXT;
ALTER TABLE "offers" ADD COLUMN "official_store" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "offers" ADD COLUMN "best_seller" BOOLEAN NOT NULL DEFAULT false;

-- {{store}} deixou de ser a marca do painel e passou a ser o vendedor do ML.
-- Reescreve os templates já salvos para {{brand}}, senão o cabeçalho das mensagens
-- trocaria o nome do canal pelo nome da loja do produto sem o usuário pedir.
UPDATE "settings"
SET "value" = regexp_replace("value", '\{\{\s*store\s*\}\}', '{{brand}}', 'g')
WHERE "key" = 'messageTemplate';

-- Mesma renomeação no JSON de visibilidade, preservando a escolha on/off do usuário.
-- As chaves novas ausentes ("store" = vendedor, "best_seller") caem no default do
-- código via mergePlaceholderVisibility.
UPDATE "settings"
SET "value" = REPLACE("value", '"store"', '"brand"')
WHERE "key" = 'messageTemplatePlaceholders';
