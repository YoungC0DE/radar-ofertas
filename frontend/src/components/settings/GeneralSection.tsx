import { Link } from 'react-router-dom';

import type { SettingsResponse } from '../../types/api.js';
import { Badge } from '../ui/Badge.js';
import { ConfigRow, EditButton } from './ConfigRow.js';

type GeneralSectionProps = {
  data: SettingsResponse;
  onEditBrand: () => void;
  onEditHours: () => void;
  onEditScore: () => void;
  onEditInterval: () => void;
  onEditSenderDelay: () => void;
};

export function GeneralSection({
  data,
  onEditBrand,
  onEditHours,
  onEditScore,
  onEditInterval,
  onEditSenderDelay,
}: GeneralSectionProps) {
  const logoMark = data.brand.logoHref ? (
    <img src={data.brand.logoHref} alt="" className="size-full object-cover" />
  ) : (
    data.brand.initial
  );

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Identidade do painel, horários, pontuação e ritmo de coleta/envio. Canais de publicação ficam
        em{' '}
        <Link className="text-primary hover:underline" to="/accounts">
          Contas
        </Link>
        .
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <ConfigRow
          label="Identidade visual"
          hint="Nome e ícone exibidos na barra lateral do painel"
          value={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-sm font-bold text-primary">
                {logoMark}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-text-primary">{data.brand.name}</div>
                <div className="text-sm text-text-secondary">{data.brand.subtitle}</div>
              </div>
              <EditButton title="Editar identidade visual" onClick={onEditBrand} />
            </div>
          }
        />
        <ConfigRow
          label="Fuso"
          value={
            <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">{data.timezone}</code>
          }
          hint="APP_TIMEZONE"
        />
        <ConfigRow
          label="Janela operacional"
          hint="Horário em que o bot coleta e envia ofertas"
          value={
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {data.operatingHoursLabel}{' '}
                <Badge tone={data.withinOperatingHours ? 'success' : 'warning'}>
                  {data.withinOperatingHours ? 'Ativo agora' : 'Fora da janela'}
                </Badge>
              </span>
              <EditButton title="Editar janela operacional" onClick={onEditHours} />
            </div>
          }
        />
        <ConfigRow
          label="Pontuação"
          hint="Critérios e score mínimo para aceitar ofertas"
          value={
            <div className="flex flex-wrap items-start gap-2">
              <div>
                <div className="font-medium">Mínimo: {data.minScore} pts</div>
                <div className="text-sm text-text-secondary">
                  {data.scoreRulesSummary.length > 0 ? (
                    data.scoreRulesSummary.map((line) => <div key={line}>{line}</div>)
                  ) : (
                    'Nenhuma regra ativa'
                  )}
                </div>
              </div>
              <EditButton title="Editar pontuação" onClick={onEditScore} />
            </div>
          }
        />
        <ConfigRow
          label="Intervalo de coleta"
          hint="Frequência de busca de novas ofertas"
          value={
            <div className="flex flex-wrap items-center gap-2">
              <span>{data.collectorIntervalMinutes} min</span>
              <EditButton title="Editar intervalo de coleta" onClick={onEditInterval} />
            </div>
          }
        />
        <ConfigRow
          label="Tempo entre envios"
          hint="Intervalo entre cada mensagem enviada nos canais"
          value={
            <div className="flex flex-wrap items-center gap-2">
              <span>{data.senderDelayMinutes} min</span>
              <EditButton title="Editar tempo entre envios" onClick={onEditSenderDelay} />
            </div>
          }
        />
      </div>
    </section>
  );
}
