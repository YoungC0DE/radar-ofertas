import {
  FileText,
  Gift,
  LayoutDashboard,
  Layers,
  LogOut,
  Radar,
  ScrollText,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/cn.js';
import { useAuth } from '../../hooks/useAuth.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/offers', label: 'Ofertas', icon: ShoppingBag },
  { to: '/settings', label: 'Configurações', icon: Settings },
  { to: '/template', label: 'Template', icon: FileText },
  { to: '/coupons', label: 'Cupons', icon: Gift },
  { to: '/sources/whatsapp', label: 'Fontes', icon: Layers },
  { to: '/accounts', label: 'Contas', icon: Users },
  { to: '/logs', label: 'Logs', icon: ScrollText },
] as const;

export function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="hidden h-screen w-[270px] shrink-0 flex-col border-r border-border bg-bg-secondary lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Radar className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-text-primary">Radar Ofertas</div>
          <div className="truncate text-xs text-text-secondary">Painel admin</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 scrollbar-thin">
        <span className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/70">
          Menu
        </span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-bg-card hover:text-text-primary',
              )
            }
          >
            <item.icon className="size-[18px] shrink-0" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={logout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-card hover:text-error"
        >
          <LogOut className="size-[18px]" aria-hidden />
          Sair
        </button>
      </div>
    </aside>
  );
}

export { NAV_ITEMS };
