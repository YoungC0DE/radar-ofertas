import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Radar, User } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.js';
import { Alert } from '../components/ui/Alert.js';
import { Button } from '../components/ui/Button.js';
import { Checkbox } from '../components/ui/Checkbox.js';
import { Input } from '../components/ui/Input.js';
import { isRememberMeEnabled } from '../services/auth-storage.js';
import { ApiError } from '../types/api.js';

function resolveLoginRedirect(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state && typeof state.from === 'string') {
    return state.from;
  }
  return '/';
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => isRememberMeEnabled());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = resolveLoginRedirect(location.state);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password, { rememberMe });
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Falha ao entrar');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-primary px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.08)_0%,_transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="rounded-2xl border border-border bg-bg-card p-8 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <Radar className="size-7" aria-hidden />
            </div>
            <h1 className="text-[36px] font-bold leading-tight text-text-primary">
              Radar Ofertas
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Entre para gerenciar ofertas, canais e integrações
            </p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={(event) => void handleSubmit(event)}>
            {error ? <Alert tone="error">{error}</Alert> : null}

            <Input
              label="Usuário"
              id="login-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              icon={<User className="size-4" />}
            />

            <Input
              label="Senha"
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              icon={<Lock className="size-4" />}
              trailing={
                <button
                  type="button"
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              }
            />

            <Checkbox
              id="login-remember"
              label="Continuar logado"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />

            <Button type="submit" className="mt-2 w-full" loading={loading} disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-secondary/70">
          Sistema de automação de ofertas · Mercado Livre & Amazon
        </p>
      </motion.div>
    </div>
  );
}
