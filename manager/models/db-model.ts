export interface DatabaseSnapshot {
  available: boolean;
  error?: string;
}

export function databaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Authentication failed')) {
      return 'Credenciais do PostgreSQL inválidas — confira DATABASE_URL no .env';
    }
    if (error.message.includes('ECONNREFUSED') || error.message.includes("Can't reach database")) {
      return 'PostgreSQL offline — suba com docker compose up -d postgres';
    }
    return error.message;
  }
  return String(error);
}

export async function withDatabase<T>(
  loader: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; database: DatabaseSnapshot }> {
  try {
    const data = await loader();
    return { data, database: { available: true } };
  } catch (error) {
    return {
      data: fallback,
      database: { available: false, error: databaseErrorMessage(error) },
    };
  }
}
