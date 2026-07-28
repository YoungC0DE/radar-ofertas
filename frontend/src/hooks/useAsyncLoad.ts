import { useEffect, useState } from 'react';

type AsyncLoadState<T> = {
  readonly data: T | null;
  readonly error: string | null;
  readonly loading: boolean;
};

export function useAsyncLoad<T>(
  load: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncLoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void load()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, error, loading };
}
