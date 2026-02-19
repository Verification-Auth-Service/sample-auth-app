# sample-auth-app

## 起動方法

### AuthSample(React Router)

pnpm -C apps/auth-app dev

## Dockerで起動

docker compose build --no-cache
docker compose up

## prismaマイグレーション

### (1) DB起動
docker compose up -d db

### (2) マイグレーション実行
docker compose run --rm db-migrate

bash
初期化してやり直す（全データ削除）
docker compose up --build --abort-on-container-exit db-migrate

bash
docker compose down -v
docker compose up -d db
docker compose run --rm db-migrate

## 環境変数（OAuth）

プロバイダごとの固定値

- `GITHUB_CLIENT_ID`（必須）
- `GITHUB_CLIENT_SECRET`（プロバイダによって必要。公開クライアント向けのフローでも要求されることがある ）
- `AUTHORIZE_URL`（認可エンドポイント）
- `TOKEN_URL`（トークンエンドポイント）
- `USERINFO_URL`（ユーザー情報エンドポイント。例：GitHub は `https://api.github.com/user`）
- `SCOPE`（最小：login-only）

アプリ側の固定値

- `REDIRECT_URI`（プロバイダに登録した callback URL と一致させる）
- `APP_ORIGIN`（`REDIRECT_URI` を組み立てる方式の場合に必要）

### GitHub の具体例

例: `APP_ORIGIN` から `REDIRECT_URI` を組み立てる場合

## apps/auth-app/.env配置環境変数

```env
GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET
AUTHORIZE_URL=https://github.com/login/oauth/authorize
TOKEN_URL=https://github.com/login/oauth/access_token
USERINFO_URL=https://api.github.com/user
SCOPE=read:user

APP_ORIGIN=http://localhost:5173
REDIRECT_URI=http://localhost:5173 /auth/github/callback
SESSION_SECRET=YOUR_SESSION_SECRET
```

SESSION_SECRETはopenssl rand -base64 48で生成可能
