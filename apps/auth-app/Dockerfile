FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
ENV PNPM_STORE_PATH=/pnpm/store
ENV DATABASE_URL=mysql://app:app@localhost:3306/app
RUN corepack enable && pnpm config set store-dir /pnpm/store
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-app/package.json ./apps/auth-app/
COPY apps/packages/db/package.json ./apps/packages/db/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --filter ./apps/auth-app... --filter ./apps/packages/db...
COPY . .
RUN pnpm -C apps/packages/db prisma generate

FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
ENV PNPM_STORE_PATH=/pnpm/store
RUN corepack enable && pnpm config set store-dir /pnpm/store
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-app/package.json ./apps/auth-app/
COPY apps/packages/db/package.json ./apps/packages/db/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --prod --filter ./apps/auth-app... --filter ./apps/packages/db...

FROM node:20-alpine AS build-env
WORKDIR /app
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY --from=development-dependencies-env /app/apps/auth-app/node_modules /app/apps/auth-app/node_modules
COPY --from=development-dependencies-env /app/apps/packages/db/node_modules /app/apps/packages/db/node_modules
COPY . /app/
RUN corepack enable
RUN pnpm -C apps/auth-app run build

FROM node:20-alpine
WORKDIR /app/apps/auth-app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY apps/auth-app/package.json /app/apps/auth-app/
COPY apps/packages/db/package.json /app/apps/packages/db/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY --from=development-dependencies-env /app/apps/auth-app/node_modules /app/apps/auth-app/node_modules
COPY --from=development-dependencies-env /app/apps/packages/db/node_modules /app/apps/packages/db/node_modules
COPY --from=build-env /app/apps/auth-app/build /app/apps/auth-app/build
RUN sed -i 's|from ".prisma/client/default"|from "../../../packages/db/node_modules/@prisma/client/default.js"|g' /app/apps/auth-app/build/server/index.js
CMD ["pnpm", "run", "start"]
