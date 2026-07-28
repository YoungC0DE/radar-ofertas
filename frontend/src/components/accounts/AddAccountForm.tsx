import { useState } from 'react';
import type { FormEvent } from 'react';

import type { AccountPlatform } from '../../types/api.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Select } from '../ui/Input.js';

type AddAccountFormProps = {
  platforms: Array<{ id: AccountPlatform; label: string }>;
  placeholder: string;
  onSubmit: (body: { platform: AccountPlatform; label: string }) => Promise<void>;
};

export function AddAccountForm({ platforms, placeholder, onSubmit }: AddAccountFormProps) {
  const [platform, setPlatform] = useState(platforms[0]?.id ?? 'whatsapp');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ platform, label: label.trim() });
      setLabel('');
    } finally {
      setLoading(false);
    }
  }

  if (platforms.length === 0) return null;

  return (
    <form
      className="mt-4 rounded-2xl border border-border bg-bg-card/50 p-4"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
        <Select
          label="Plataforma"
          id="account-platform"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as AccountPlatform)}
        >
          {platforms.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
        <Input
          label="Nome"
          id="account-label"
          value={label}
          required
          placeholder={placeholder}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Button type="submit" disabled={loading} className="md:mb-0">
          {loading ? 'Adicionando…' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}
