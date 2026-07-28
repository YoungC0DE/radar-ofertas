import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import type { ScoreCategory, ScoreConfig, SettingsResponse } from '../../types/api.js';
import {
  SCORE_CATEGORY_KEYS,
  SCORE_CATEGORY_LABELS,
  scoreComparatorLabel,
  scoreInputMax,
  scoreInputStep,
  scoreUnitLabel,
  type ScoreCategoryKey,
} from '../../constants/score.js';
import { endHourForForm } from '../../constants/affiliates.js';
import { Modal, ModalActions } from '../ui/Modal.js';
import { Checkbox } from '../ui/Checkbox.js';
import { Input } from '../ui/Input.js';

type SettingsModalsProps = {
  data: SettingsResponse;
  activeModal: SettingsModalId | null;
  onClose: () => void;
  onSaveBrand: (body: {
    name: string;
    subtitle: string;
    logoData?: string;
    removeLogo?: boolean;
  }) => Promise<void>;
  onSaveScore: (config: ScoreConfig) => Promise<void>;
  onSaveHours: (body: { startHour: number; endHour: number }) => Promise<void>;
  onSaveInterval: (minutes: number) => Promise<void>;
  onSaveSenderDelay: (minutes: number) => Promise<void>;
  onSaveCouponsUrl: (url: string) => Promise<void>;
  onSaveAmazonAffiliate: (body: {
    baseUrl: string;
    affiliateLinkPrefix: string;
    storeId: string;
  }) => Promise<void>;
};

export type SettingsModalId =
  | 'brand'
  | 'score'
  | 'hours'
  | 'interval'
  | 'senderDelay'
  | 'couponsUrl'
  | 'amazonAffiliate';

function ScoreCategoryEditor({
  categoryKey,
  config,
  onChange,
}: {
  categoryKey: ScoreCategoryKey;
  config: ScoreCategory;
  onChange: (next: ScoreCategory) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
      <Checkbox
        label={SCORE_CATEGORY_LABELS[categoryKey]}
        labelClassName="font-semibold"
        checked={config.enabled}
        onChange={(event) => onChange({ ...config, enabled: event.target.checked })}
      />
      <div className="mt-3 flex flex-col gap-3">
        {config.tiers.map((tier, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-bg-card p-3">
            <Checkbox
              label={<span className="font-medium text-text-secondary">Faixa {index + 1}</span>}
              checked={tier.enabled}
              onChange={(event) => {
                const tiers = config.tiers.map((item, i) =>
                  i === index ? { ...item, enabled: event.target.checked } : item,
                );
                onChange({ ...config, tiers });
              }}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-text-secondary">{scoreComparatorLabel(categoryKey)}</span>
              <input
                type="number"
                className="h-9 w-20 rounded-lg border border-border bg-bg-secondary px-2 text-sm"
                value={tier.threshold}
                min={0}
                step={scoreInputStep(categoryKey)}
                max={scoreInputMax(categoryKey)}
                onChange={(event) => {
                  const tiers = config.tiers.map((item, i) =>
                    i === index
                      ? { ...item, threshold: Number.parseFloat(event.target.value) }
                      : item,
                  );
                  onChange({ ...config, tiers });
                }}
              />
              <span className="text-text-secondary">{scoreUnitLabel(categoryKey)}</span>
              <span className="text-text-secondary">→</span>
              <span className="text-text-secondary">+</span>
              <input
                type="number"
                className="h-9 w-16 rounded-lg border border-border bg-bg-secondary px-2 text-sm"
                value={tier.points}
                min={0}
                step={1}
                onChange={(event) => {
                  const tiers = config.tiers.map((item, i) =>
                    i === index ? { ...item, points: Number.parseInt(event.target.value, 10) } : item,
                  );
                  onChange({ ...config, tiers });
                }}
              />
              <span className="text-text-secondary">pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandModal({
  data,
  open,
  onClose,
  onSave,
}: {
  data: SettingsResponse;
  open: boolean;
  onClose: () => void;
  onSave: SettingsModalsProps['onSaveBrand'];
}) {
  const [name, setName] = useState(data.brand.name);
  const [subtitle, setSubtitle] = useState(data.brand.subtitle);
  const [previewLogo, setPreviewLogo] = useState<string | null>(data.brand.logoHref);
  const [newLogoData, setNewLogoData] = useState<string | undefined>();
  const [removeLogo, setRemoveLogo] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(data.brand.name);
    setSubtitle(data.brand.subtitle);
    setPreviewLogo(data.brand.logoHref);
    setNewLogoData(undefined);
    setRemoveLogo(false);
  }, [open, data.brand]);

  const previewMark = removeLogo ? (
    (name.trim().charAt(0) || data.brand.initial).toUpperCase()
  ) : previewLogo ? (
    <img src={previewLogo} alt="" />
  ) : (
    (name.trim().charAt(0) || data.brand.initial).toUpperCase()
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        subtitle: subtitle.trim(),
        ...(newLogoData ? { logoData: newLogoData } : {}),
        ...(removeLogo ? { removeLogo: true } : {}),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Editar identidade visual"
      onClose={onClose}
      wide
      footer={<ModalActions onCancel={onClose} onConfirm={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent)} loading={loading} />}
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-sm font-bold text-primary">
            {previewMark}
          </div>
          <div>
            <div className="font-semibold text-text-primary">{name || data.brand.name}</div>
            <div className="text-sm text-text-secondary">{subtitle}</div>
          </div>
        </div>
        <Input label="Nome do painel" value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} />
        <Input label="Subtítulo" value={subtitle} maxLength={120} onChange={(e) => setSubtitle(e.target.value)} />
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-text-secondary">Imagem do ícone</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setRemoveLogo(false);
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  setNewLogoData(reader.result);
                  setPreviewLogo(reader.result);
                }
              };
              reader.readAsDataURL(file);
            }}
          />
        </div>
        {data.brand.logoHref ? (
          <Checkbox
            label="Remover imagem atual"
            checked={removeLogo}
            onChange={(event) => setRemoveLogo(event.target.checked)}
          />
        ) : null}
        <p className="text-xs text-text-secondary">
          A imagem é salva em base64 no arquivo de configuração. Se nenhuma for definida, será
          exibida a inicial do nome.
        </p>
      </form>
    </Modal>
  );
}

function SimpleNumberModal({
  open,
  title,
  label,
  help,
  initialValue,
  min,
  max,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  label: string;
  help: string;
  initialValue: number;
  min: number;
  max: number;
  onClose: () => void;
  onSave: (value: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(initialValue));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setValue(String(initialValue));
  }, [open, initialValue]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave(Number.parseInt(value, 10));
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      wide
      footer={<ModalActions onCancel={onClose} onConfirm={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent)} loading={loading} />}
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label={label}
          type="number"
          value={value}
          min={min}
          max={max}
          step={1}
          required
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="text-xs text-text-secondary">{help}</p>
      </form>
    </Modal>
  );
}

export function SettingsModals(props: SettingsModalsProps) {
  const { data, activeModal, onClose } = props;
  const [scoreConfig, setScoreConfig] = useState(data.scoreConfig);
  const [scoreLoading, setScoreLoading] = useState(false);

  useEffect(() => {
    if (activeModal === 'score') setScoreConfig(data.scoreConfig);
  }, [activeModal, data.scoreConfig]);

  async function handleScoreSave(event: FormEvent) {
    event.preventDefault();
    setScoreLoading(true);
    try {
      await props.onSaveScore(scoreConfig);
      onClose();
    } finally {
      setScoreLoading(false);
    }
  }

  return (
    <>
      <BrandModal
        data={data}
        open={activeModal === 'brand'}
        onClose={onClose}
        onSave={props.onSaveBrand}
      />

      <Modal
        open={activeModal === 'score'}
        title="Editar pontuação"
        onClose={onClose}
        wide
        footer={
          <ModalActions
            onCancel={onClose}
            onConfirm={() => void handleScoreSave({ preventDefault: () => undefined } as FormEvent)}
            loading={scoreLoading}
          />
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleScoreSave(event)}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <Input
              label="Score mínimo para aceitar oferta"
              type="number"
              className="max-w-[120px]"
              value={scoreConfig.minScore}
              min={0}
              step={1}
              required
              onChange={(event) =>
                setScoreConfig({ ...scoreConfig, minScore: Number.parseInt(event.target.value, 10) })
              }
            />
            <p className="text-xs text-text-secondary sm:pt-7">
              Ofertas com score abaixo deste valor são descartadas.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {SCORE_CATEGORY_KEYS.map((key) => (
              <ScoreCategoryEditor
                key={key}
                categoryKey={key}
                config={scoreConfig[key]}
                onChange={(next) => setScoreConfig({ ...scoreConfig, [key]: next })}
              />
            ))}
          </div>
          <p className="text-xs text-text-secondary">
            Use as flags para ativar/desativar categorias e faixas. Em cada categoria, só a melhor
            faixa aplicável conta — exceto em Preço, onde as faixas podem somar.
          </p>
        </form>
      </Modal>

      <HoursModal
        data={data}
        open={activeModal === 'hours'}
        onClose={onClose}
        onSave={props.onSaveHours}
      />

      <SimpleNumberModal
        open={activeModal === 'interval'}
        title="Editar intervalo de coleta"
        label="Intervalo (minutos)"
        help="Define de quanto em quanto tempo o bot busca novas ofertas (1 a 1440 min)."
        initialValue={data.collectorIntervalMinutes}
        min={1}
        max={1440}
        onClose={onClose}
        onSave={props.onSaveInterval}
      />

      <SimpleNumberModal
        open={activeModal === 'senderDelay'}
        title="Editar tempo entre envios"
        label="Intervalo (minutos)"
        help="Tempo de espera entre cada oferta enviada no WhatsApp (0 a 1440 min). Use 0 para envio imediato."
        initialValue={data.senderDelayMinutes}
        min={0}
        max={1440}
        onClose={onClose}
        onSave={props.onSaveSenderDelay}
      />

      <CouponsUrlModal
        data={data}
        open={activeModal === 'couponsUrl'}
        onClose={onClose}
        onSave={props.onSaveCouponsUrl}
      />

      <AmazonAffiliateModal
        data={data}
        open={activeModal === 'amazonAffiliate'}
        onClose={onClose}
        onSave={props.onSaveAmazonAffiliate}
      />
    </>
  );
}

function HoursModal({
  data,
  open,
  onClose,
  onSave,
}: {
  data: SettingsResponse;
  open: boolean;
  onClose: () => void;
  onSave: (body: { startHour: number; endHour: number }) => Promise<void>;
}) {
  const [startHour, setStartHour] = useState(String(data.operatingHours.start));
  const [endHour, setEndHour] = useState(String(endHourForForm(data.operatingHours.end)));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStartHour(String(data.operatingHours.start));
    setEndHour(String(endHourForForm(data.operatingHours.end)));
  }, [open, data.operatingHours]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        startHour: Number.parseInt(startHour, 10),
        endHour: Number.parseInt(endHour, 10),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Editar janela operacional"
      onClose={onClose}
      wide
      footer={<ModalActions onCancel={onClose} onConfirm={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent)} loading={loading} />}
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-text-secondary">Início</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="h-10 w-full rounded-[10px] border border-border bg-bg-secondary px-3 text-sm"
                value={startHour}
                min={0}
                max={23}
                required
                onChange={(e) => setStartHour(e.target.value)}
              />
              <span className="text-sm text-text-secondary">:00</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-text-secondary">Fim</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="h-10 w-full rounded-[10px] border border-border bg-bg-secondary px-3 text-sm"
                value={endHour}
                min={1}
                max={24}
                required
                onChange={(e) => setEndHour(e.target.value)}
              />
              <span className="text-sm text-text-secondary">:00</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-text-secondary">
          O bot só coleta e envia ofertas dentro deste intervalo (fuso: {data.timezone}). Informe a
          hora cheia — ex.: 9 = 09:00. Use 24 como fim do dia.
        </p>
      </form>
    </Modal>
  );
}

function CouponsUrlModal({
  data,
  open,
  onClose,
  onSave,
}: {
  data: SettingsResponse;
  open: boolean;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(data.mlCouponsUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setUrl(data.mlCouponsUrl);
  }, [open, data.mlCouponsUrl]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave(url.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Editar URL de cupons"
      onClose={onClose}
      wide
      footer={<ModalActions onCancel={onClose} onConfirm={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent)} loading={loading} />}
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="URL do hub de cupons"
          type="url"
          value={url}
          required
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="text-xs text-text-secondary">Ex.: https://www.mercadolivre.com.br/afiliados/coupons#hub</p>
      </form>
    </Modal>
  );
}

function AmazonAffiliateModal({
  data,
  open,
  onClose,
  onSave,
}: {
  data: SettingsResponse;
  open: boolean;
  onClose: () => void;
  onSave: SettingsModalsProps['onSaveAmazonAffiliate'];
}) {
  const [baseUrl, setBaseUrl] = useState(data.amazonAffiliate.baseUrl);
  const [storeId, setStoreId] = useState(data.amazonAffiliate.storeId);
  const [affiliateLinkPrefix, setAffiliateLinkPrefix] = useState(
    data.amazonAffiliate.affiliateLinkPrefix,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBaseUrl(data.amazonAffiliate.baseUrl);
    setStoreId(data.amazonAffiliate.storeId);
    setAffiliateLinkPrefix(data.amazonAffiliate.affiliateLinkPrefix);
  }, [open, data.amazonAffiliate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({ baseUrl: baseUrl.trim(), storeId: storeId.trim(), affiliateLinkPrefix: affiliateLinkPrefix.trim() });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Editar links Amazon"
      onClose={onClose}
      wide
      footer={<ModalActions onCancel={onClose} onConfirm={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent)} loading={loading} />}
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="URL base do site"
          type="url"
          value={baseUrl}
          required
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <Input
          label="ID da loja (tracking tag)"
          value={storeId}
          placeholder="mercadaodasfa-20"
          onChange={(e) => setStoreId(e.target.value)}
        />
        <Input
          label="Prefixo customizado (opcional)"
          value={affiliateLinkPrefix}
          onChange={(e) => setAffiliateLinkPrefix(e.target.value)}
        />
        <p className="text-xs text-text-secondary">
          Não use link.amazon — o formato oficial é amazon.com.br/dp/ASIN?tag=sua-loja.
        </p>
      </form>
    </Modal>
  );
}
