import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../services/api.js';
import type { AccountCard as AccountCardData, AccountsResponse } from '../types/api.js';
import { ApiError } from '../types/api.js';
import {
  MercadoLivreConfigModal,
  TelegramConfigModal,
  WhatsAppConfigModal,
} from '../components/accounts/AccountConfigModals.js';
import { AccountCard } from '../components/accounts/AccountCard.js';
import { AddAccountForm } from '../components/accounts/AddAccountForm.js';
import {
  MercadoLivreLoginModal,
  WhatsAppLoginModal,
} from '../components/accounts/ConnectModals.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { useConfirm } from '../components/feedback/ConfirmProvider.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Page } from '../components/ui/Layout.js';
import { Spinner } from '../components/ui/Spinner.js';
import { openNovncTab } from '../utils/novnc.js';

type ConfigTarget = {
  accountId: string;
  platform: AccountCardData['account']['platform'];
};

export function AccountsPage() {
  const { pushToast } = useToast();
  const { confirm } = useConfirm();

  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configTarget, setConfigTarget] = useState<ConfigTarget | null>(null);
  const [waLoginAccountId, setWaLoginAccountId] = useState<string | null>(null);
  const [mlLoginAccountId, setMlLoginAccountId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setError(null);
    try {
      const response = await api.getAccounts();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar contas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const allCards = useMemo(
    () => (data ? [...data.integrations, ...data.marketplaces] : []),
    [data],
  );

  const configCard = useMemo(() => {
    if (!configTarget) return null;
    return allCards.find(
      (card) =>
        card.account.id === configTarget.accountId &&
        card.account.platform === configTarget.platform,
    );
  }, [allCards, configTarget]);

  async function reloadAfter(action: () => Promise<AccountsResponse | void>) {
    try {
      const response = await action();
      if (response) setData(response);
      else await loadAccounts();
      pushToast('Alteração salva com sucesso', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar', 'error');
      throw err;
    }
  }

  if (loading) {
    return <Spinner label="Carregando contas…" />;
  }

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (!data) {
    return <Alert tone="warning">Nenhum dado disponível</Alert>;
  }

  return (
    <Page>
      <PageHeader
        title="Contas"
        subtitle="Integrações de publicação e marketplaces de afiliados"
      />

      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Integrações</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Canais de publicação — WhatsApp e Telegram. Use <strong>Logar</strong> para autenticar.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.integrations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-bg-card/50 px-6 py-10 text-center text-sm text-text-secondary">
              <p>Nenhuma integração cadastrada.</p>
            </div>
          ) : (
            data.integrations.map((card) => (
              <AccountCard
                key={`${card.account.id}-${card.account.platform}`}
                card={card}
                variant="integration"
                onConfigure={() =>
                  setConfigTarget({
                    accountId: card.account.id,
                    platform: card.account.platform,
                  })
                }
                onLogin={() => {
                  if (card.account.platform === 'whatsapp') {
                    setWaLoginAccountId(card.account.id);
                  } else if (card.account.platform === 'telegram') {
                    void api.verifyTelegramConnect(card.account.id).then((state) => {
                      if (state.ok) {
                        pushToast('Telegram conectado', 'success');
                        void loadAccounts();
                      } else {
                        pushToast(state.detail || 'Telegram não conectado', 'error');
                        setConfigTarget({
                          accountId: card.account.id,
                          platform: card.account.platform,
                        });
                      }
                    });
                  }
                }}
                onToggle={() =>
                  void reloadAfter(() =>
                    api.toggleAccount(card.account.id, card.account.platform),
                  )
                }
                onDelete={() => {
                  void (async () => {
                    const ok = await confirm({
                      title: 'Remover conta',
                      message: `Remover a conta ${card.account.label}?`,
                      confirmLabel: 'Remover',
                      tone: 'danger',
                    });
                    if (!ok) return;
                    await reloadAfter(async () => {
                      await api.deleteAccount(card.account.id, card.account.platform);
                    });
                  })();
                }}
              />
            ))
          )}
        </div>
        <AddAccountForm
          platforms={data.integrationPlatforms}
          placeholder="Ex: WhatsApp Promoções"
          onSubmit={(body) => reloadAfter(() => api.createAccount(body))}
        />
      </section>

      <section className="border-t border-border pt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Marketplaces — Afiliados</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Contas de sessão para coleta e links de afiliado no Mercado Livre.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.marketplaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-bg-card/50 px-6 py-10 text-center text-sm text-text-secondary">
              <p>Nenhum marketplace de afiliados cadastrado.</p>
            </div>
          ) : (
            data.marketplaces.map((card) => (
              <AccountCard
                key={`${card.account.id}-${card.account.platform}`}
                card={card}
                variant="marketplace"
                onConfigure={() =>
                  setConfigTarget({
                    accountId: card.account.id,
                    platform: card.account.platform,
                  })
                }
                onLogin={() => {
                  openNovncTab(data.novncPort);
                  setMlLoginAccountId(card.account.id);
                }}
                onToggle={() =>
                  void reloadAfter(() =>
                    api.toggleAccount(card.account.id, card.account.platform),
                  )
                }
                onDelete={() => {
                  void (async () => {
                    const ok = await confirm({
                      title: 'Remover conta',
                      message: `Remover a conta ${card.account.label}?`,
                      confirmLabel: 'Remover',
                      tone: 'danger',
                    });
                    if (!ok) return;
                    await reloadAfter(async () => {
                      await api.deleteAccount(card.account.id, card.account.platform);
                    });
                  })();
                }}
              />
            ))
          )}
        </div>
        <AddAccountForm
          platforms={data.marketplacePlatforms}
          placeholder="Ex: Afiliado ML secundário"
          onSubmit={(body) => reloadAfter(() => api.createAccount(body))}
        />
      </section>

      {configCard?.account.platform === 'whatsapp' ? (
        <WhatsAppConfigModal
          card={configCard}
          open
          onClose={() => setConfigTarget(null)}
          onSaveChannel={(inviteLink) =>
            reloadAfter(() => api.patchWhatsAppChannel(configCard.account.id, { inviteLink }))
          }
          onAddDestination={(inviteInput) =>
            reloadAfter(() =>
              api.addWhatsAppDestination(configCard.account.id, { inviteInput }),
            )
          }
          onToggleDestination={(destinationId, enabled) =>
            reloadAfter(() =>
              api.toggleWhatsAppDestination(configCard.account.id, { destinationId, enabled }),
            )
          }
          onRemoveDestination={(destinationId) =>
            reloadAfter(() =>
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
            reloadAfter(() => api.patchTelegramConfig(configCard.account.id, body))
          }
        />
      ) : null}

      {configCard?.account.platform === 'mercado_livre' ? (
        <MercadoLivreConfigModal
          card={configCard}
          open
          onClose={() => setConfigTarget(null)}
          onSave={(affiliateTag) =>
            reloadAfter(() =>
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
          // Creds podem atrasar um instante no volume compartilhado com o worker.
          void (async () => {
            await loadAccounts();
            await new Promise((resolve) => setTimeout(resolve, 800));
            await loadAccounts();
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
        }}
      />
    </Page>
  );
}
