FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
ENV PNPM_STORE_PATH=/pnpm/store
ENV DATABASE_URL=mysql://app:app@localhost:3306/app
RUN corepack enable && pnpm config set store-dir /pnpm/store
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/resource-server/package.json ./apps/resource-server/
COPY apps/packages/db-resource/package.json ./apps/packages/db-resource/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --filter ./apps/resource-server... --filter ./apps/packages/db-resource...
COPY . .
RUN pnpm -C apps/packages/db-resource prisma generate

FROM development-dependencies-env AS dev-env
WORKDIR /app/apps/resource-server
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0", "--port", "5174"]

FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
ENV PNPM_STORE_PATH=/pnpm/store
RUN corepack enable && pnpm config set store-dir /pnpm/store
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/resource-server/package.json ./apps/resource-server/
COPY apps/packages/db-resource/package.json ./apps/packages/db-resource/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --prod --filter ./apps/resource-server... --filter ./apps/packages/db-resource...

FROM node:20-alpine AS build-env
WORKDIR /app
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY --from=development-dependencies-env /app/apps/resource-server/node_modules /app/apps/resource-server/node_modules
COPY --from=development-dependencies-env /app/apps/packages/db-resource/node_modules /app/apps/packages/db-resource/node_modules
COPY . /app/
RUN corepack enable
RUN pnpm -C apps/resource-server run build

FROM node:20-alpine
WORKDIR /app/apps/resource-server
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY apps/resource-server/package.json /app/apps/resource-server/
COPY apps/packages/db-resource/package.json /app/apps/packages/db-resource/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY --from=development-dependencies-env /app/apps/resource-server/node_modules /app/apps/resource-server/node_modules
COPY --from=development-dependencies-env /app/apps/packages/db-resource/node_modules /app/apps/packages/db-resource/node_modules
COPY --from=build-env /app/apps/resource-server/build /app/apps/resource-server/build
RUN sed -i 's|from ".prisma/client/default"|from "../../../packages/db-resource/node_modules/@prisma/client/default.js"|g' /app/apps/resource-server/build/server/index.js
CMD ["pnpm", "run", "start"]
