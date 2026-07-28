import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

type ContainerProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-8', className)}>
      {children}
    </div>
  );
}

type PageProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export function Page({ children, className = '' }: PageProps) {
  return <div className={cn('flex flex-col gap-8', className)}>{children}</div>;
}
