import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type TabItem = {
  id: string;
  label: string;
  badge?: ReactNode;
  content: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'primary' | 'sub';
  ariaLabel?: string;
};

export function Tabs({
  items,
  activeId,
  onChange,
  variant = 'primary',
  ariaLabel = 'Seções',
}: TabsProps) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          'flex flex-wrap gap-1 rounded-xl border border-border bg-bg-secondary/50 p-1',
          variant === 'sub' && 'gap-2 border-0 bg-transparent p-0',
        )}
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`tab-panel-${item.id}`}
              className={cn(
                'cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                variant === 'sub' && 'border border-border',
                active
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-text-secondary hover:bg-bg-card hover:text-text-primary',
              )}
              onClick={() => onChange(item.id)}
            >
              {item.label} {item.badge}
            </button>
          );
        })}
      </div>
      <div>
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <div key={item.id} id={`tab-panel-${item.id}`} role="tabpanel" hidden={!active}>
              {active ? item.content : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function useHashTab(defaultTab: string, validTabs: readonly string[]) {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace(/^#/, '');
    return validTabs.includes(hash) ? hash : defaultTab;
  });

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace(/^#/, '');
      if (validTabs.includes(hash)) setActiveTab(hash);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [validTabs]);

  function setTab(id: string) {
    setActiveTab(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  return [activeTab, setTab] as const;
}
