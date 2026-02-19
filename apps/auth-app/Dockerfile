FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS build-env
WORKDIR /app
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY . /app/
RUN corepack enable
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
CMD ["pnpm", "run", "start"]
