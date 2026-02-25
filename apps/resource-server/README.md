# resource-server

最小構成の Resource Server サンプルです。

## 機能

- `GET /login` ログイン画面
- `POST /login` Cookie セッション作成
- `POST /logout` ログアウト
- `GET /dashboard` ログイン必須ページ
- `GET /me` 現在ユーザー(JSON)
- `GET /api/protected` 保護 API(JSON)

## 起動

```bash
pnpm -C apps/resource-server dev
```

## DB（apps/resource-server 用）

`resource-server` のログイン認証は DB（MySQL / Prisma）を使用します。`apps/packages/db-resource` の Prisma Client を使用します（`auth-app` 用と分離）。

### 想定環境変数

```env
DATABASE_URL=mysql://app:app@127.0.0.1:3306/app
```

Docker Compose 内から参照する場合:

```env
DATABASE_URL=mysql://app:app@db:3306/app
```

### DB 起動（共有）

```bash
docker compose up -d db
```

### マイグレーション（`resource_users` 作成）

```bash
docker compose run --rm db-resource-migrate
```

### 現在の DB 利用範囲

- `resource_users`（ローカルログインユーザー）

セッション自体は引き続き Cookie ベースです（`__rs_session`）。

## デモ認証情報（DBに自動投入）

- username: `admin`
- password: `password`

`/login` アクセス時に、環境変数の値を使ってデモユーザーを `resource_users` に `upsert` します。

環境変数で変更可能:

- `DATABASE_URL`（必須）
- `RESOURCE_DATABASE_URL`（任意。未指定時は `DATABASE_URL` を使用）
- `RESOURCE_SERVER_USERNAME`
- `RESOURCE_SERVER_PASSWORD`
- `RESOURCE_SERVER_DISPLAY_NAME`
- `RESOURCE_SERVER_SESSION_SECRET`（未指定時は開発用デフォルト）
