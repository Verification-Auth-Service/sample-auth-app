FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Build from workspace root so frozen lockfile uses the canonical workspace lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/packages/db/package.json ./apps/packages/db/package.json
COPY apps/packages/db/prisma ./apps/packages/db/prisma
COPY apps/packages/db/prisma.config.ts ./apps/packages/db/prisma.config.ts

RUN pnpm -C apps/packages/db install --frozen-lockfile --prod=false

WORKDIR /app/apps/packages/db

CMD ["pnpm", "prisma", "migrate", "deploy"]
