# resource-server

最小構成の Resource Server サンプルです。

## 機能

- `GET /login` ログイン画面
- `POST /login` Cookie セッション作成
- `POST /logout` ログアウト
- `GET /dashboard` ログイン必須ページ
- `GET /me` 現在ユーザー(JSON)
- `GET /api/protected` 保護 API(JSON, セッションまたはBearerトークン)
- `GET /oauth/authorize` OAuth 認可エンドポイント（Authorization Code）
- `POST /oauth/token` OAuth トークンエンドポイント（authorization_code / refresh_token）

## 起動

```bash
pnpm -C apps/resource-server dev
```

## テスト

以下のコマンドで `apps/resource-server` のユニットテストを実行できます。

```bash
pnpm -C apps/resource-server test -- --run
```

主なテスト対象:

- `app/services/oauth.server.spec.ts`
  - 認可コードのワンタイム性
  - `redirect_uri` 不一致時の拒否
  - アクセストークン検証
  - リフレッシュトークンによる再発行
- `app/routes/oauth.token.spec.ts`
  - クライアント認証失敗時の `invalid_client`
  - `authorization_code` / `refresh_token` の成功系
  - 未対応 `grant_type` の拒否
- `app/routes/api.protected.spec.ts`
  - Bearer 優先認証
  - Bearer 不正時の `invalid_token`
  - Session フォールバック
  - 未認証時 `unauthorized`

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
- `RESOURCE_OAUTH_CLIENT_ID`（既定: `sample-client`）
- `RESOURCE_OAUTH_CLIENT_SECRET`（既定: `sample-secret`）
- `RESOURCE_OAUTH_REDIRECT_URI`（既定: `http://localhost:5173/oauth/callback`）
- `RESOURCE_OAUTH_CLIENT_NAME`（既定: `Sample OAuth Client`）
- `RESOURCE_OAUTH_CODE_TTL_SEC`（既定: `120`）
- `RESOURCE_OAUTH_ACCESS_TOKEN_TTL_SEC`（既定: `3600`）
- `RESOURCE_OAUTH_REFRESH_TOKEN_TTL_SEC`（既定: `1209600`）

## OAuth 動作確認

1. ブラウザで `/login` へアクセスしてログイン
2. ブラウザで以下へアクセス（認可画面が表示）

```text
/oauth/authorize?response_type=code&client_id=sample-client&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Foauth%2Fcallback&scope=read&state=state123
```

3. `Authorize` を押すと `redirect_uri` に `code` が付与される
4. その `code` を使ってトークン交換

```bash
curl -X POST http://localhost:3001/oauth/token \
  -d grant_type=authorization_code \
  -d client_id=sample-client \
  -d client_secret=sample-secret \
  -d redirect_uri=http://localhost:5173/oauth/callback \
  -d code=<authorization_code>
```

5. 取得した `access_token` で保護API呼び出し

```bash
curl http://localhost:3001/api/protected \
  -H \"Authorization: Bearer <access_token>\"
```
