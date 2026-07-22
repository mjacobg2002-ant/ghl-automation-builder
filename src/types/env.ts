export interface Env {
  // KV namespace: caches the Firebase ID token (key = KV_TOKEN_KEY) and the
  // persisted refresh token (key = "ghl_refresh_token", written by
  // /admin/token/seed once GHL_FIREBASE_REFRESH_TOKEN rotates).
  GHL_MCP_KV: KVNamespace;

  // Secrets (wrangler secret put). GHL_FIREBASE_REFRESH_TOKEN is required;
  // ADMIN_API_KEY is optional but strongly recommended once deployed.
  GHL_FIREBASE_REFRESH_TOKEN: string;
  ADMIN_API_KEY?: string;

  // Vars (wrangler.toml [vars]).
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  GHL_INTERNAL_BASE_URL: string;
  KV_TOKEN_KEY: string;
  KV_TOKEN_TTL_SECONDS: string;
  DEFAULT_LOCATION_ID?: string;
}
