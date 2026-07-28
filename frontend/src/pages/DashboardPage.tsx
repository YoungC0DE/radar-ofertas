import {
  Activity,
  CheckCircle2,
  Clock,
  Package,
  Send,
  Timer,
} from 'lucide-react';

import { api } from '../services/api.js';
import type { DashboardResponse } from '../types/api.js';
import { useAsyncLoad } from '../hooks/useAsyncLoad.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';
import { Page } from '../components/ui/Layout.js';
import { Spinner } from '../components/ui/Spinner.js';
import { cn } from '../lib/cn.js';

type StatCardProps = {
  readonly label: string;
  readonly value: number;
  readonly icon: typeof Package;
  readonly accent?: string;
};

function StatCard({ label, value, icon: Icon, accent = 'text-primary' }: StatCardProps) {
  return (
    <Card padding="md" className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{value}</p>
        </div>
        <div className={cn('flex size-11 items-center justify-center rounded-xl bg-bg-secondary', accent)}>
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { data, error, loading } = useAsyncLoad<DashboardResponse>(() => api.dashboard(), []);

  if (loading) {
    return <Spinner label="Carregando dashboard…" fullPage />;
  }

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (!data) {
    return <Alert tone="warning">Nenhum dado disponível</Alert>;
  }

  const endHour = data.operatingHours.end === 0 ? '24' : data.operatingHours.end;

  return (
    <Page>
      <PageHeader
        subtitle={`Fuso: ${data.timezone} · Janela operacional ${data.operatingHours.start}h–${endHour}h`}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total de ofertas" value={data.stats.total} icon={Package} />
        <StatCard
          label="Pendentes"
          value={data.stats.pending}
          icon={Clock}
          accent="text-warning"
        />
        <StatCard
          label="Enviadas"
          value={data.stats.sent}
          icon={Send}
          accent="text-success"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Status operacional">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex size-12 items-center justify-center rounded-xl',
                data.withinOperatingHours ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
              )}
            >
              {data.withinOperatingHours ? (
                <CheckCircle2 className="size-6" />
              ) : (
                <Timer className="size-6" />
              )}
            </div>
            <div>
              <Badge tone={data.withinOperatingHours ? 'success' : 'warning'}>
                {data.withinOperatingHours ? 'Dentro da janela' : 'Fora da janela'}
              </Badge>
              <p className="mt-2 text-sm text-text-secondary">
                {data.withinOperatingHours
                  ? 'Coletas e envios seguem o agendamento normal.'
                  : 'Envios aguardam o próximo horário operacional.'}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Integrações" description="Status das conexões ativas">
          <ul className="flex flex-col gap-3">
            {data.sessions.map((session) => (
              <li
                key={session.label}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-bg-secondary/50 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Activity
                    className={cn(
                      'size-4 shrink-0',
                      session.ok ? 'text-success' : 'text-error',
                    )}
                    aria-hidden
                  />
                  <span className="truncate text-sm font-medium text-text-primary">
                    {session.label}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={session.ok ? 'success' : 'danger'}>
                    {session.ok ? 'OK' : 'Erro'}
                  </Badge>
                  <span className="hidden text-xs text-text-secondary sm:inline">
                    {session.detail}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
