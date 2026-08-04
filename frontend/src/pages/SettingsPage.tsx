import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../services/api.js';
import type { AccountCard as AccountCardData, AccountsResponse, ScoreConfig, SettingsResponse } from '../types/api.js';
import { ApiError } from '../types/api.js';
import {
  MercadoLivreConfigModal,
  TelegramConfigModal,
  WhatsAppConfigModal,
} from '../components/accounts/AccountConfigModals.js';
import {
  MercadoLivreLoginModal,
  WhatsAppLoginModal,
} from '../components/accounts/ConnectModals.js';
import { useConfirm } from '../components/feedback/ConfirmProvider.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { CollectionSection } from '../components/settings/CollectionSection.js';
import { GeneralSection } from '../components/settings/GeneralSection.js';
import { IntegrationsSection } from '../components/settings/IntegrationsSection.js';
import { OperationsSection } from '../components/settings/OperationsSection.js';
import {
  SettingsModals,
  type SettingsModalId,
} from '../components/settings/SettingsModals.js';
import { Tabs, useHashTab } from '../components/settings/Tabs.js';
import { Alert } from '../components/ui/Alert.js';
import { Page } from '../components/ui/Layout.js';
import { Spinner } from '../components/ui/Spinner.js';
import { openNovncTab } from '../utils/novnc.js';

const MAIN_TABS = ['geral', 'integracoes', 'coleta', 'operacoes'] as const;

type ConfigTarget = {
  accountId: string;
  platform: AccountCardData['account']['platform'];
};

export function SettingsPage() {
  const { pushToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useHashTab('geral', MAIN_TABS);

  const [data, setData] = useState<SettingsResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<SettingsModalId | null>(null);
  const [configTarget, setConfigTarget] = useState<ConfigTarget | null>(null);
  const [waLoginAccountId, setWaLoginAccountId] = useState<string | null>(null);
  const [mlLoginAccountId, setMlLoginAccountId] = useState<string | null>(null);

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
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Falha ao carregar contas', 'error');
    }
  }, [pushToast]);

  useEffect(() => {
    void loadSettings();
    void loadAccounts();
  }, [loadSettings, loadAccounts]);

  const allCards = useMemo(
    () => (accounts ? [...accounts.integrations, ...accounts.marketplaces] : []),
    [accounts],
  );

  const configCard = useMemo(() => {
    if (!configTarget) return null;
    return allCards.find(
      (card) =>
        card.account.id === configTarget.accountId &&
        card.account.platform === configTarget.platform,
    );
  }, [allCards, configTarget]);

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

  async function reloadAccountsAfter(action: () => Promise<AccountsResponse | void>) {
    try {
      const response = await action();
      if (response) setAccounts(response);
      else await loadAccounts();
      pushToast('Alteração salva com sucesso', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar', 'error');
      throw err;
    }
  }

  async function handleDeleteAccount(
    accountId: string,
    platform: AccountCardData['account']['platform'],
    label: string,
  ) {
    const ok = await confirm({
      title: 'Remover conta',
      message: `Remover a conta ${label}?`,
      confirmLabel: 'Remover',
      tone: 'danger',
    });
    if (!ok) return;
    await reloadAccountsAfter(async () => {
      await api.deleteAccount(accountId, platform);
    });
  }

  async function handleTelegramLogin(accountId: string) {
    const state = await api.verifyTelegramConnect(accountId);
    if (state.ok) {
      pushToast('Telegram conectado', 'success');
      await loadAccounts();
      return;
    }
    pushToast(state.detail || 'Telegram não conectado', 'error');
    setConfigTarget({ accountId, platform: 'telegram' });
  }

  if (loading) {
    return <Spinner label="Carregando configurações…" />;
  }

  if (error || !data) {
    return <Alert tone="error">{error ?? 'Dados indisponíveis'}</Alert>;
  }

  if (!accounts) {
    return <Spinner label="Carregando contas…" />;
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
      id: 'integracoes',
      label: 'Integrações',
      content: (
        <IntegrationsSection
          data={accounts}
          onConfigure={(accountId, platform) => setConfigTarget({ accountId, platform })}
          onLoginWhatsApp={setWaLoginAccountId}
          onLoginTelegram={(accountId) => void handleTelegramLogin(accountId)}
          onToggle={(accountId, platform) =>
            void reloadAccountsAfter(() => api.toggleAccount(accountId, platform))
          }
          onDelete={(accountId, platform, label) =>
            void handleDeleteAccount(accountId, platform, label)
          }
          onAddAccount={(body) => reloadAccountsAfter(() => api.createAccount(body))}
        />
      ),
    },
    {
      id: 'coleta',
      label: 'Coleta',
      content: (
        <CollectionSection
          settings={data}
          accounts={accounts}
          onEditCouponsUrl={() => setActiveModal('couponsUrl')}
          onEditAmazonAffiliate={() => setActiveModal('amazonAffiliate')}
          onConfigureMercadoLivre={(accountId) =>
            setConfigTarget({ accountId, platform: 'mercado_livre' })
          }
          onLoginMercadoLivre={(accountId) => {
            openNovncTab(accounts.novncPort);
            setMlLoginAccountId(accountId);
          }}
          onToggleMercadoLivre={(accountId) =>
            void reloadAccountsAfter(() => api.toggleAccount(accountId, 'mercado_livre'))
          }
          onToggleAmazon={() =>
            void persist(
              () =>
                api.patchAmazonCollection({
                  enabled: !data.amazonCollectionEnabled,
                }),
              data.amazonCollectionEnabled ? 'Coleta Amazon desativada' : 'Coleta Amazon ativada',
            )
          }
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
      <PageHeader
        title="Configuração"
        subtitle="Identidade, integrações, coleta de ofertas e operações"
      />

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

      {configCard?.account.platform === 'whatsapp' ? (
        <WhatsAppConfigModal
          card={configCard}
          open
          onClose={() => setConfigTarget(null)}
          onSaveChannel={(inviteLink) =>
            reloadAccountsAfter(() =>
              api.patchWhatsAppChannel(configCard.account.id, { inviteLink }),
            )
          }
          onAddDestination={(inviteInput) =>
            reloadAccountsAfter(() =>
              api.addWhatsAppDestination(configCard.account.id, { inviteInput }),
            )
          }
          onToggleDestination={(destinationId, enabled) =>
            reloadAccountsAfter(() =>
              api.toggleWhatsAppDestination(configCard.account.id, { destinationId, enabled }),
            )
          }
          onRemoveDestination={(destinationId) =>
            reloadAccountsAfter(() =>
              api.removeWhatsAppDestination(configCard.account.id, { destinationId }),
            )
          }
        />
      ) : null}

      {configCard?.account.platform === 'telegram' ? (
        <TelegramConfigModal
          card={configCard}
          open
          onClose={() => setConfigTarget(null)}
          onSave={(body) =>
            reloadAccountsAfter(() => api.patchTelegramConfig(configCard.account.id, body))
          }
        />
      ) : null}

      {configCard?.account.platform === 'mercado_livre' ? (
        <MercadoLivreConfigModal
          card={configCard}
          open
          onClose={() => setConfigTarget(null)}
          onSave={(affiliateTag) =>
            reloadAccountsAfter(() =>
              api.patchMercadoLivreConfig(configCard.account.id, { affiliateTag }),
            )
          }
        />
      ) : null}

      <WhatsAppLoginModal
        open={waLoginAccountId != null}
        accountId={waLoginAccountId}
        onClose={() => setWaLoginAccountId(null)}
        onStart={(accountId) => api.startWhatsAppConnect(accountId)}
        onPoll={(accountId) => api.getWhatsAppConnectStatus(accountId)}
        onConnected={() => {
          pushToast('WhatsApp conectado', 'success');
          setWaLoginAccountId(null);
          void (async () => {
            await loadAccounts();
            await new Promise((resolve) => setTimeout(resolve, 800));
            await loadAccounts();
            await loadSettings();
          })();
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
          void loadAccounts();
          void loadSettings();
        }}
      />
    </Page>
  );
}
