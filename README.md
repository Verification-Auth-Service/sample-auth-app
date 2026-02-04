# sample-auth-app

## 環境変数（OAuth）
プロバイダごとの固定値
- `CLIENT_ID`（必須）
- `CLIENT_SECRET`（プロバイダによって必要。PKCEでも要求されることがある）
- `AUTHORIZE_URL`（認可エンドポイント）
- `TOKEN_URL`（トークンエンドポイント）
- `USERINFO_URL`（ユーザー情報エンドポイント。例：GitHub は `https://api.github.com/user`）
- `SCOPE`（最小：login-only）

アプリ側の固定値
- `REDIRECT_URI`（プロバイダに登録した callback URL と一致させる）
- `APP_ORIGIN`（`REDIRECT_URI` を組み立てる方式の場合に必要）

### GitHub の具体例
例: `APP_ORIGIN` から `REDIRECT_URI` を組み立てる場合

```env
CLIENT_ID=YOUR_GITHUB_CLIENT_ID
CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET
AUTHORIZE_URL=https://github.com/login/oauth/authorize
TOKEN_URL=https://github.com/login/oauth/access_token
USERINFO_URL=https://api.github.com/user
SCOPE=read:user

APP_ORIGIN=http://localhost:3000
REDIRECT_URI=http://localhost:3000/auth/github/callback
```
