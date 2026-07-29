import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../services/api.js';
import type { AccountsResponse, ScoreConfig, SettingsResponse } from '../types/api.js';
import { ApiError } from '../types/api.js';
import {
  MercadoLivreLoginModal,
  WhatsAppLoginModal,
} from '../components/accounts/ConnectModals.js';
import { AffiliateSection } from '../components/settings/AffiliateSection.js';
import { ConnectionsSection } from '../components/settings/ConnectionsSection.js';
import { GeneralSection } from '../components/settings/GeneralSection.js';
import { OperationsSection } from '../components/settings/OperationsSection.js';
import {
  SettingsModals,
  type SettingsModalId,
} from '../components/settings/SettingsModals.js';
import { Tabs, useHashTab } from '../components/settings/Tabs.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Page } from '../components/ui/Layout.js';
import { Spinner } from '../components/ui/Spinner.js';
import { DEFAULT_ACCOUNT_ID } from '../constants/accounts.js';
import { openNovncTab } from '../utils/novnc.js';

const MAIN_TABS = ['geral', 'afiliados', 'conexoes', 'operacoes'] as const;

function resolveAccountId(
  accounts: AccountsResponse | null,
  platform: 'whatsapp' | 'telegram' | 'mercado_livre',
): string {
  if (!accounts) return DEFAULT_ACCOUNT_ID;
  const pool =
    platform === 'mercado_livre' ? accounts.marketplaces : accounts.integrations;
  const match = pool.find((card) => card.account.platform === platform);
  return match?.account.id ?? DEFAULT_ACCOUNT_ID;
}

export function SettingsPage() {
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useHashTab('geral', MAIN_TABS);
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<SettingsModalId | null>(null);
  const [waLoginAccountId, setWaLoginAccountId] = useState<string | null>(null);
  const [mlLoginAccountId, setMlLoginAccountId] = useState<string | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);

  const loadSettings = useCallback(async () => {
    setError(null);
    try {
      const response = await api.getSettings();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      setAccounts(await api.getAccounts());
    } catch {
      /* contas opcionais para resolver IDs de conexão */
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadAccounts();
  }, [loadSettings, loadAccounts]);

  const waAccountId = useMemo(
    () => resolveAccountId(accounts, 'whatsapp'),
    [accounts],
  );
  const mlAccountId = useMemo(
    () => resolveAccountId(accounts, 'mercado_livre'),
    [accounts],
  );
  const telegramAccountId = useMemo(
    () => resolveAccountId(accounts, 'telegram'),
    [accounts],
  );

  async function persist(
    action: () => Promise<SettingsResponse>,
    successMessage: string,
  ) {
    try {
      const response = await action();
      setData(response);
      pushToast(successMessage, 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar', 'error');
      throw err;
    }
  }

  if (loading) {
    return <Spinner label="Carregando configurações…" />;
  }

  if (error || !data) {
    return <Alert tone="error">{error ?? 'Dados indisponíveis'}</Alert>;
  }

  const tabItems = [
    {
      id: 'geral',
      label: 'Geral',
      content: (
        <GeneralSection
          data={data}
          onEditBrand={() => setActiveModal('brand')}
          onEditHours={() => setActiveModal('hours')}
          onEditScore={() => setActiveModal('score')}
          onEditInterval={() => setActiveModal('interval')}
          onEditSenderDelay={() => setActiveModal('senderDelay')}
        />
      ),
    },
    {
      id: 'afiliados',
      label: 'Afiliados',
      content: (
        <AffiliateSection
          data={data}
          onEditCouponsUrl={() => setActiveModal('couponsUrl')}
          onEditAmazonAffiliate={() => setActiveModal('amazonAffiliate')}
        />
      ),
    },
    {
      id: 'conexoes',
      label: 'Conexões',
      content: (
        <ConnectionsSection
          data={data}
          telegramBusy={telegramBusy}
          onConnectWhatsApp={() => setWaLoginAccountId(waAccountId)}
          onConnectMercadoLivre={() => {
            openNovncTab(data.novncPort);
            setMlLoginAccountId(mlAccountId);
          }}
          onVerifyTelegram={() => {
            setTelegramBusy(true);
            void api
              .verifyTelegramConnect(telegramAccountId)
              .then((state) => {
                if (state.ok) {
                  pushToast('Telegram conectado', 'success');
                  void loadSettings();
                } else {
                  pushToast(state.detail || 'Telegram não conectado', 'error');
                }
              })
              .catch((err) => {
                pushToast(err instanceof ApiError ? err.message : 'Falha ao verificar Telegram', 'error');
              })
              .finally(() => setTelegramBusy(false));
          }}
        />
      ),
    },
    {
      id: 'operacoes',
      label: 'Operações',
      content: <OperationsSection data={data} />,
    },
  ];

  return (
    <Page>
      <PageHeader title="Configuração" subtitle="Identidade, score, afiliados, conexões e operações" />

      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} ariaLabel="Configurações" />

      <SettingsModals
        data={data}
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onSaveBrand={(body) =>
          persist(() => api.patchBrandSettings(body), 'Identidade visual salva')
        }
        onSaveScore={(config: ScoreConfig) =>
          persist(() => api.patchScoreSettings(config), 'Regras de score salvas')
        }
        onSaveHours={(body) =>
          persist(() => api.patchOperatingHours(body), 'Janela operacional salva')
        }
        onSaveInterval={(minutes) =>
          persist(() => api.patchSendInterval({ intervalMinutes: minutes }), 'Intervalo de coleta salvo')
        }
        onSaveSenderDelay={(minutes) =>
          persist(() => api.patchSenderDelay({ senderDelayMinutes: minutes }), 'Tempo entre envios salvo')
        }
        onSaveCouponsUrl={(url) =>
          persist(() => api.patchCouponsUrl({ couponsUrl: url }), 'URL de cupons salva')
        }
        onSaveAmazonAffiliate={(body) =>
          persist(() => api.patchAmazonAffiliate(body), 'Configuração Amazon salva')
        }
      />

      <WhatsAppLoginModal
        open={waLoginAccountId != null}
        accountId={waLoginAccountId}
        onClose={() => setWaLoginAccountId(null)}
        onStart={(accountId) => api.startWhatsAppConnect(accountId)}
        onPoll={(accountId) => api.getWhatsAppConnectStatus(accountId)}
        onConnected={() => {
          pushToast('WhatsApp conectado', 'success');
          setWaLoginAccountId(null);
          void loadSettings();
        }}
      />

      <MercadoLivreLoginModal
        open={mlLoginAccountId != null}
        accountId={mlLoginAccountId}
        onClose={() => setMlLoginAccountId(null)}
        onStart={(accountId) => api.startMercadoLivreConnect(accountId)}
        onPoll={(accountId) => api.getMercadoLivreConnectStatus(accountId)}
        onFinish={(accountId) => api.finishMercadoLivreConnect(accountId)}
        onCancel={async (accountId) => {
          await api.cancelMercadoLivreConnect(accountId);
        }}
        onConnected={() => {
          pushToast('Sessão ML salva', 'success');
          setMlLoginAccountId(null);
          void loadSettings();
        }}
      />
    </Page>
  );
}
