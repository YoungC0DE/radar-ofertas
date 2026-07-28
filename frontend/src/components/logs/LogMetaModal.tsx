import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';

type LogMetaModalProps = {
  open: boolean;
  meta: Record<string, unknown> | null;
  onClose: () => void;
};

export function LogMetaModal({ open, meta, onClose }: LogMetaModalProps) {
  return (
    <Modal
      open={open}
      title="Detalhes do evento"
      onClose={onClose}
      wide
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <pre className="m-0 max-h-[420px] overflow-auto rounded-lg border border-[#30363d] bg-[#0d1117] p-3.5 font-mono text-[0.8rem] text-[#c9d1d9]">
        {JSON.stringify(meta ?? {}, null, 2)}
      </pre>
    </Modal>
  );
}
