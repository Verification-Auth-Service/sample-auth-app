# sample-auth-app

## 起動方法

### AuthSample(React Router)

pnpm -C apps/auth-app dev

## Dockerで起動（Vite dev + HMR）

docker compose build --no-cache

docker compose up

`react-router-auth-sample` は Vite の dev サーバーで起動し、`apps/auth-app` 配下の変更がホットリロードされます。

## prismaマイグレーション

### (1) DB起動

docker compose up -d db

### (2) マイグレーション実行

docker compose run --rm db-migrate

bash
初期化してやり直す（全データ削除）
docker compose up --build --abort-on-container-exit db-migrate

bash

```
docker compose down -v

docker compose up -d db

docker compose run --rm db-migrate
```

## 環境変数（OAuth）

プロバイダごとの固定値（OAuth App）

- `GITHUB_CLIENT_ID`（必須）
- `GITHUB_CLIENT_SECRET`（プロバイダによって必要。公開クライアント向けのフローでも要求されることがある ）
- `AUTHORIZE_URL`（認可エンドポイント）
- `TOKEN_URL`（トークンエンドポイント）
- `USERINFO_URL`（ユーザー情報エンドポイント。例：GitHub は `https://api.github.com/user`）
- `SCOPE`（最小：login-only）

GitHub App（User Access Token）用

- `GITHUB_APP_CLIENT_ID`（必須）
- `GITHUB_APP_CLIENT_SECRET`（必須）
- `GITHUB_APP_AUTHORIZE_URL`（省略可。既定は `https://github.com/login/oauth/authorize`）
- `GITHUB_APP_TOKEN_URL`（省略可。既定は `https://github.com/login/oauth/access_token`）
- `GITHUB_APP_SCOPE`（省略可）
- `GITHUB_APP_REDIRECT_URI`（省略可。`APP_ORIGIN` から組み立てる場合は不要）

`Sign Up with GitHub (GitHub App)` で private repository を取得するには、少なくとも以下が必要です。

- `GITHUB_APP_SCOPE` に `repo read:user` を含める（例: `GITHUB_APP_SCOPE=repo read:user`）
- GitHub App 側で対象 private repository へのアクセス権を許可してインストールする

refresh-token関係のためにopt-inにしている必要がある(ややこしいが、ボタンがopt-outになっている必要がある)
doc/opt-in.png

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

GITHUB_APP_CLIENT_ID=YOUR_GITHUB_APP_CLIENT_ID
GITHUB_APP_CLIENT_SECRET=YOUR_GITHUB_APP_CLIENT_SECRET
GITHUB_APP_AUTHORIZE_URL=https://github.com/login/oauth/authorize
GITHUB_APP_TOKEN_URL=https://github.com/login/oauth/access_token
GITHUB_APP_SCOPE=repo read:user
# GITHUB_APP_REDIRECT_URI=http://localhost:5173/auth/github-app/callback

APP_ORIGIN=http://localhost:5173
REDIRECT_URI=http://localhost:5173 /auth/github/callback
SESSION_SECRET=YOUR_SESSION_SECRET
```

SESSION_SECRETはopenssl rand -base64 48で生成可能
