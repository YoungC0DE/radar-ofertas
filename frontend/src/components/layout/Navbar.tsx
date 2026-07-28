import { Bell, Menu, Radar, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '../../lib/cn.js';
import { useAuth } from '../../hooks/useAuth.js';
import { NAV_ITEMS } from './Sidebar.js';
import { ThemeToggle } from './ThemeToggle.js';

function resolvePageTitle(pathname: string): string {
  if (pathname.startsWith('/offers/')) return 'Detalhe da oferta';
  if (pathname.startsWith('/sources/')) return 'Fontes';

  const match = NAV_ITEMS.find((item) => {
    if ('end' in item && item.end) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  });

  return match?.label ?? 'Radar Ofertas';
}

function userInitials(username: string | undefined): string {
  if (!username) return '?';
  return username.slice(0, 2).toUpperCase();
}

type NavbarProps = {
  readonly onMenuClick?: () => void;
};

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [search, setSearch] = useState('');

  const pageTitle = useMemo(() => resolvePageTitle(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-bg-primary/80 px-4 backdrop-blur-md lg:px-8">
      <button
        type="button"
        className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden items-center gap-2 lg:flex">
        <Radar className="size-5 text-primary lg:hidden" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-text-primary">{pageTitle}</h1>
      </div>

      <div className="hidden max-w-xs flex-1 md:block lg:max-w-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar…"
            className="h-10 w-full rounded-[10px] border border-border bg-bg-secondary pl-10 pr-3 text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          className="relative flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          aria-label="Notificações"
        >
          <Bell className="size-[18px]" />
        </button>
      </div>

      <div className="flex items-center gap-3 pl-1">
        <div
          className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
          aria-hidden
        >
          {userInitials(user?.username)}
        </div>
        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-sm font-medium text-text-primary">
            {user?.username ?? 'Usuário'}
          </div>
          <div className="truncate text-xs text-text-secondary">Administrador</div>
        </div>
      </div>
    </header>
  );
}

type MobileNavProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

export function MobileNav({ open, onClose }: MobileNavProps) {
  const { logout } = useAuth();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        role="presentation"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-border bg-bg-secondary lg:hidden">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Radar className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold">Radar Ofertas</div>
            <div className="text-xs text-text-secondary">Painel admin</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-secondary hover:bg-bg-card hover:text-text-primary',
                )
              }
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-card hover:text-error"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
