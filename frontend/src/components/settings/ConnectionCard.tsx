import type { SessionStatus } from '../../types/api.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { Card } from '../ui/Card.js';

type ConnectionCardProps = {
  service: 'ml' | 'wa' | 'telegram';
  name: string;
  icon: string;
  status: SessionStatus;
  onConnect: () => void;
  connectDisabled?: boolean;
};

export function ConnectionCard({
  name,
  icon,
  status,
  onConnect,
  connectDisabled = false,
}: ConnectionCardProps) {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bg-secondary text-xl">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-text-primary">{name}</div>
            <div className="mt-1 text-sm text-text-secondary">{status.detail}</div>
          </div>
          <Badge tone={status.ok ? 'success' : 'warning'} className="sm:ml-auto shrink-0">
            {status.ok ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>
        <Button disabled={connectDisabled} onClick={onConnect} className="shrink-0">
          {status.ok ? 'Reconectar' : 'Conectar'}
        </Button>
      </div>
    </Card>
  );
}
