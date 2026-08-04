import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { cn } from '../../lib/cn.js';
import { Button } from './Button.js';

type ModalProps = {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly wide?: boolean;
};

export function Modal({ open, title, onClose, children, footer, wide = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
          <motion.div
            className={cn(
              'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-[0_20px_50px_rgba(0,0,0,0.4)]',
              wide ? 'max-w-3xl' : 'max-w-lg',
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 id="modal-title" className="text-lg font-semibold text-text-primary">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-6 py-4">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type ModalActionsProps = {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly confirmLabel?: string;
  readonly loading?: boolean;
};

export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel = 'Salvar',
  loading = false,
}: ModalActionsProps) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        Cancelar
      </Button>
      <Button onClick={onConfirm} loading={loading} disabled={loading}>
        {loading ? 'Salvando…' : confirmLabel}
      </Button>
    </>
  );
}
