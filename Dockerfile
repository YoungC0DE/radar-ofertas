FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Baileys e libsignal vêm do GitHub; lock antigo pode referenciar git+ssh
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --global url."https://github.com/".insteadOf "git@github.com:"

RUN npm ci --ignore-scripts
RUN npx playwright install chromium
RUN npm run prisma:generate

RUN mkdir -p /app/data

CMD ["npx", "tsx", "watch", "src/app.ts"]
