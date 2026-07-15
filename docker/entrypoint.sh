#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ] && [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  echo "Aplicando migrations..."
  npx prisma migrate deploy
fi

exec "$@"
