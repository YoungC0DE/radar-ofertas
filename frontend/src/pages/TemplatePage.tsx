import { useCallback, useEffect, useState } from 'react';

import { api } from '../services/api.js';
import type { TemplateResponse } from '../types/api.js';
import { ApiError } from '../types/api.js';
import {
  COUPON_PLACEHOLDERS,
  MESSAGE_PLACEHOLDERS,
} from '../constants/template-placeholders.js';
import { AutoMessageCard, NewAutoMessageCard } from '../components/template/AutoMessageCard.js';
import { MessageTemplateEditor } from '../components/template/MessageTemplateEditor.js';
import { TemplateAccordion } from '../components/template/TemplateAccordion.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Page } from '../components/ui/Layout.js';
import { Spinner } from '../components/ui/Spinner.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/Table.js';
import { truncateText } from '../utils/format.js';
import type { formStateToAutoMessageBody } from '../utils/auto-message.js';

export function TemplatePage() {
  const { pushToast } = useToast();
  const [data, setData] = useState<TemplateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openSection, setOpenSection] = useState<'offer' | 'coupon' | 'auto'>('offer');

  const loadTemplate = useCallback(async () => {
    setError(null);
    try {
      const response = await api.getTemplate();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar template');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  async function handleOfferSave(template: string, placeholderVisibility: Record<string, boolean>) {
    setBusy(true);
    try {
      const response = await api.patchOfferTemplate({ template, placeholderVisibility });
      setData(response);
      setOpenSection('offer');
      pushToast('Template de ofertas salvo', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar template', 'error');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleCouponSave(template: string, placeholderVisibility: Record<string, boolean>) {
    setBusy(true);
    try {
      const response = await api.patchCouponTemplate({ template, placeholderVisibility });
      setData(response);
      setOpenSection('coupon');
      pushToast('Template de cupom salvo', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar template de cupom', 'error');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoSave(
    id: string,
    body: ReturnType<typeof formStateToAutoMessageBody>,
  ) {
    setBusy(true);
    try {
      const response = await api.updateAutoMessage(id, body);
      setData(response);
      setOpenSection('auto');
      pushToast('Mensagem automática salva', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar mensagem', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoCreate(body: ReturnType<typeof formStateToAutoMessageBody>) {
    setBusy(true);
    try {
      const response = await api.createAutoMessage(body);
      setData(response);
      setOpenSection('auto');
      pushToast('Mensagem automática criada', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao criar mensagem', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoSend(id: string) {
    setBusy(true);
    try {
      await api.sendAutoMessage(id);
      pushToast('Mensagem enfileirada para envio', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao enviar mensagem', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoDelete(id: string) {
    setBusy(true);
    try {
      await api.deleteAutoMessage(id);
      await loadTemplate();
      pushToast('Mensagem excluída', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao excluir mensagem', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Spinner label="Carregando template…" />;
  }

  if (error || !data) {
    return <Alert tone="error">{error ?? 'Dados indisponíveis'}</Alert>;
  }

  const offerPreviewNote = data.offerTemplate.previewOffer
    ? `Preview com a oferta mais recente: ${truncateText(data.offerTemplate.previewOffer.title, 50)}`
    : 'Nenhuma oferta salva ainda — preview usa dados de exemplo.';

  return (
    <Page>
      <PageHeader
        title="Mensagem"
        subtitle="Templates de ofertas, cupons e mensagens automáticas"
      />

      {!data.database.available ? (
        <Alert tone="warning">
          {`Banco indisponível — ${data.database.error ?? 'algumas funções podem falhar ao salvar'}`}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        <TemplateAccordion
          key={`offer-${openSection}`}
          title="Mensagem de ofertas"
          description="Edite o texto livremente. Use os placeholders — o bot substitui automaticamente na hora do envio. Placeholders desativados não aparecem na mensagem final."
          defaultOpen={openSection === 'offer'}
        >
          <MessageTemplateEditor
            key={`offer-${data.offerTemplate.template}`}
            editorId="offer-template-editor"
            template={data.offerTemplate.template}
            defaultTemplate={data.offerTemplate.defaultTemplate}
            previewValues={data.offerTemplate.previewValues}
            placeholderMeta={MESSAGE_PLACEHOLDERS}
            placeholderVisibility={data.offerTemplate.placeholderVisibility}
            previewNote={offerPreviewNote}
            saveLabel="Salvar template"
            onSave={handleOfferSave}
          />
        </TemplateAccordion>

        <TemplateAccordion
          key={`coupon-${openSection}`}
          title="Mensagem de cupom"
          description="Texto usado ao clicar em Enviar ao canal na página de Cupons. Use os placeholders — o bot substitui automaticamente na hora do envio."
          defaultOpen={openSection === 'coupon'}
        >
          <MessageTemplateEditor
            key={`coupon-${data.couponTemplate.template}`}
            editorId="coupon-template-editor"
            template={data.couponTemplate.template}
            defaultTemplate={data.couponTemplate.defaultTemplate}
            previewValues={data.couponTemplate.previewValues}
            placeholderMeta={COUPON_PLACEHOLDERS}
            placeholderVisibility={data.couponTemplate.placeholderVisibility}
            previewNote="Preview com dados de exemplo de cupom disponível."
            saveLabel="Salvar template de cupom"
            onSave={handleCouponSave}
          />
        </TemplateAccordion>

        <TemplateAccordion
          key={`auto-${openSection}`}
          title="Mensagens automáticas"
          description="Crie textos como bom dia, código promocional ou avisos. Salve a mensagem, escolha o horário de envio e clique em Salvar e programar — o bot envia automaticamente no horário definido."
          defaultOpen={openSection === 'auto'}
        >
          <div className="flex flex-col gap-4">
            {data.autoMessages.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nenhuma mensagem automática ainda. Crie uma abaixo.
              </p>
            ) : (
              data.autoMessages.map((message) => (
                <AutoMessageCard
                  key={`${message.id}-${message.updatedAt}`}
                  message={message}
                  busy={busy}
                  onSave={handleAutoSave}
                  onSend={handleAutoSend}
                  onDelete={handleAutoDelete}
                />
              ))
            )}
          </div>

          <NewAutoMessageCard onCreate={handleAutoCreate} busy={busy} />

          <Table className="mt-6">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Código</TableHeaderCell>
                <TableHeaderCell>Significado</TableHeaderCell>
                <TableHeaderCell>Exemplo</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.autoMessagePlaceholders.map((item) => (
                <TableRow key={item.key}>
                  <TableCell>
                    <code className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[0.82rem]">
                      {`{{${item.key}}}`}
                    </code>
                  </TableCell>
                  <TableCell>{item.label}</TableCell>
                  <TableCell className="text-sm text-text-secondary">{item.example}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TemplateAccordion>
      </div>
    </Page>
  );
}
