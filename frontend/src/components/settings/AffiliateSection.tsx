import { Link } from 'react-router-dom';
import { useState } from 'react';

import type { SettingsResponse } from '../../types/api.js';
import {
  AFFILIATE_PLATFORM_DEFINITIONS,
  affiliateStatusLabel,
  buildExampleAmazonLink,
} from '../../constants/affiliates.js';
import { Badge } from '../ui/Badge.js';
import { ConfigRow, EditButton } from './ConfigRow.js';
import { Tabs } from './Tabs.js';

type AffiliateSectionProps = {
  data: SettingsResponse;
  onEditCouponsUrl: () => void;
  onEditAmazonAffiliate: () => void;
};

function affiliateBadgeTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'links_only') return 'warning';
  return 'neutral';
}

function MercadoLivrePanel({ data, onEditCouponsUrl }: AffiliateSectionProps) {
  const sourceLinks = (
    <>
      <Link className="text-primary hover:underline" to="/sources/whatsapp">
        Fontes do WhatsApp
      </Link>
      {data.telegram.enabled ? (
        <>
          {' · '}
          <Link className="text-primary hover:underline" to="/sources/telegram">
            Fontes do Telegram
          </Link>
        </>
      ) : null}
    </>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-card">
      <ConfigRow
        label="URL de cupons"
        hint="Hub de cupons do portal de afiliados"
        value={
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
              {data.mlCouponsUrl}
            </code>
            <EditButton title="Editar URL de cupons" onClick={onEditCouponsUrl} />
          </div>
        }
      />
      <ConfigRow
        label="Fontes de coleta"
        hint="Categorias e URLs monitoradas — uma seleção por canal de envio"
        value={sourceLinks}
      />
    </div>
  );
}

function AmazonPanel({ data, onEditAmazonAffiliate }: AffiliateSectionProps) {
  const exampleLink = buildExampleAmazonLink(data.amazonAffiliate);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-card">
      <ConfigRow
        label="Site Amazon"
        hint="Home do marketplace — ex.: amazon.com.br"
        value={
          <code className="max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
            {data.amazonAffiliate.baseUrl}
          </code>
        }
      />
      <ConfigRow
        label="ID da loja (tag)"
        hint="Obrigatório — ex.: mercadaodasfa-20"
        value={
          <code className="max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
            {data.amazonAffiliate.storeId || '—'}
          </code>
        }
      />
      <ConfigRow
        label="Prefixo customizado"
        hint="Opcional — deixe vazio para usar o formato oficial amazon.com.br/dp/ASIN?tag=..."
        value={
          <div className="flex flex-wrap items-center gap-2">
            {data.amazonAffiliate.affiliateLinkPrefix.trim() ? (
              <code className="max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
                {data.amazonAffiliate.affiliateLinkPrefix}
              </code>
            ) : (
              <span className="text-sm text-text-secondary">Não usado — links gerados com ?tag=</span>
            )}
            <EditButton title="Editar links Amazon" onClick={onEditAmazonAffiliate} />
          </div>
        }
      />
      <ConfigRow
        label="Exemplo gerado"
        hint="ASIN B0DNHGQHMY com sua tag de afiliado"
        value={
          <code className="block max-w-full truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
            {exampleLink}
          </code>
        }
      />
      <ConfigRow
        label="Fontes de coleta"
        hint="Browse nodes, buscas e produtos Amazon — mesma página de fontes por canal"
        value={
          <>
            <Link className="text-primary hover:underline" to="/sources/whatsapp">
              Fontes do WhatsApp
            </Link>
            {data.telegram.enabled ? (
              <>
                {' · '}
                <Link className="text-primary hover:underline" to="/sources/telegram">
                  Fontes do Telegram
                </Link>
              </>
            ) : null}
          </>
        }
      />
      <p className="border-t border-border/50 px-5 py-4 text-sm text-text-secondary">
        Links de afiliado gerados automaticamente com amazon.com.br/dp/ASIN?tag=sua-loja.
      </p>
    </div>
  );
}

function ComingSoonPanel({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <p className="text-sm text-text-primary">
        O programa <strong>{label}</strong> ainda não está disponível nesta instalação.
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        A estrutura de contas, fontes de coleta e sessão de afiliado seguirá o mesmo padrão do
        Mercado Livre.
      </p>
    </div>
  );
}

export function AffiliateSection(props: AffiliateSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState('mercado_livre');

  const items = AFFILIATE_PLATFORM_DEFINITIONS.map((platform) => ({
    id: platform.id,
    label: platform.label,
    badge: (
      <Badge tone={affiliateBadgeTone(platform.status)}>{affiliateStatusLabel(platform.status)}</Badge>
    ),
    content: (
      <>
        {platform.description ? (
          <p className="mb-4 text-sm text-text-secondary">{platform.description}</p>
        ) : null}
        {platform.id === 'mercado_livre' ? (
          <MercadoLivrePanel {...props} />
        ) : platform.id === 'amazon' ? (
          <AmazonPanel {...props} />
        ) : (
          <ComingSoonPanel label={platform.label} />
        )}
      </>
    ),
  }));

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Cada marketplace tem sessão, fontes de coleta e cupons próprios.
      </p>
      <Tabs
        items={items}
        activeId={activeSubTab}
        onChange={setActiveSubTab}
        variant="sub"
        ariaLabel="Programas de afiliados"
      />
    </section>
  );
}
