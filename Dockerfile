FROM node:22-bookworm-slim

WORKDIR /app

# Dependências de sistema para Playwright/Chromium, noVNC (login ML no painel) e git (Baileys)
# noVNC via Git — o pacote Debian é incompleto; usamos vnc_lite.html (UI mínima, estável).
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    xvfb \
    x11vnc \
    x11-utils \
    websockify \
    && git clone --depth 1 --branch v1.5.0 https://github.com/novnc/noVNC.git /usr/share/novnc \
    && test -f /usr/share/novnc/vnc_lite.html \
    && test -f /usr/share/novnc/core/rfb.js \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY manager ./manager
COPY docker ./docker

RUN chmod +x /app/docker/manager-entrypoint.sh

# Baileys e libsignal vêm do GitHub via HTTPS (evita git+ssh no lock)
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --global url."https://github.com/".insteadOf "git@github.com:" \
    && git config --global http.version HTTP/1.1

# PLAYWRIGHT_BROWSERS_PATH precisa existir ANTES do install — senão o Chromium
# baixa para ~/.cache e o runtime procura em /ms-playwright (vazio).
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    GIT_TERMINAL_PROMPT=0

RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 300000

RUN mkdir -p /ms-playwright \
    && for attempt in 1 2 3 4 5; do \
         npm ci --ignore-scripts && break; \
         if [ "$attempt" -eq 5 ]; then exit 1; fi; \
         echo "npm ci falhou (tentativa $attempt/5), aguardando..."; \
         sleep $((attempt * 10)); \
       done \
    && npm run install:browser \
    && npm run prisma:generate \
    && mkdir -p /app/data

CMD ["npx", "tsx", "src/app.ts"]
