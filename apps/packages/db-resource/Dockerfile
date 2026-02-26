FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/packages/db-resource/package.json ./apps/packages/db-resource/package.json
COPY apps/packages/db-resource/prisma ./apps/packages/db-resource/prisma
COPY apps/packages/db-resource/prisma.config.ts ./apps/packages/db-resource/prisma.config.ts

RUN pnpm -C apps/packages/db-resource install --frozen-lockfile --prod=false

WORKDIR /app/apps/packages/db-resource

CMD ["pnpm", "prisma", "migrate", "deploy"]
