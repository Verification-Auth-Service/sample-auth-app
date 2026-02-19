FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
ENV PNPM_STORE_PATH=/pnpm/store
RUN corepack enable && pnpm config set store-dir /pnpm/store
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-app/package.json ./apps/auth-app/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm -C apps/auth-app install --frozen-lockfile
COPY . .

FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
ENV PNPM_STORE_PATH=/pnpm/store
RUN corepack enable && pnpm config set store-dir /pnpm/store
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-app/package.json ./apps/auth-app/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm -C apps/auth-app install --frozen-lockfile --prod

FROM node:20-alpine AS build-env
WORKDIR /app
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY --from=development-dependencies-env /app/apps/auth-app/node_modules /app/apps/auth-app/node_modules
COPY . /app/
RUN corepack enable
RUN pnpm -C apps/auth-app run build

FROM node:20-alpine
WORKDIR /app/apps/auth-app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY apps/auth-app/package.json /app/apps/auth-app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=production-dependencies-env /app/apps/auth-app/node_modules /app/apps/auth-app/node_modules
COPY --from=build-env /app/apps/auth-app/build /app/apps/auth-app/build
CMD ["pnpm", "run", "start"]
