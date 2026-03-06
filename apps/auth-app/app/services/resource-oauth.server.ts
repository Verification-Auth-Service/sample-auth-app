function getEnvOrDefault(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function getResourceServerBaseUrl() {
  return getEnvOrDefault("RESOURCE_SERVER_BASE_URL", "http://localhost:5174");
}

export function getResourceAuthorizeUrl() {
  return getEnvOrDefault("RESOURCE_OAUTH_AUTHORIZE_URL", `${getResourceServerBaseUrl()}/oauth/authorize`);
}

export function getResourceTokenUrl() {
  return getEnvOrDefault("RESOURCE_OAUTH_TOKEN_URL", `${getResourceServerBaseUrl()}/oauth/token`);
}

export function getResourceProtectedApiUrl() {
  return getEnvOrDefault("RESOURCE_PROTECTED_API_URL", `${getResourceServerBaseUrl()}/api/protected`);
}

export function getResourceClientId() {
  return getEnvOrDefault("RESOURCE_OAUTH_CLIENT_ID", "sample-client");
}

export function getResourceClientSecret() {
  return getEnvOrDefault("RESOURCE_OAUTH_CLIENT_SECRET", "sample-secret");
}

export function getResourceScope() {
  return getEnvOrDefault("RESOURCE_OAUTH_SCOPE", "read");
}

export function getResourceRedirectUri(origin: string) {
  const explicit = process.env.RESOURCE_OAUTH_REDIRECT_URI;
  if (explicit) return explicit;

  const appOrigin = process.env.APP_ORIGIN ?? origin;
  return new URL("/auth/resource/callback", appOrigin).toString();
}
