import type { TokenStore } from "../auth/tokenStore";

/**
 * Runtime-agnostic environment every handler (auth, API client, tools) runs
 * against. Deliberately has no Cloudflare-specific types -- the Worker entry
 * (src/index.ts) builds this from its raw bindings (src/worker/bindings.ts)
 * via KvTokenStore, and the local stdio entry (src/local/stdio.ts) builds it
 * from process.env via FileTokenStore. Everything downstream of this type
 * (auth/, ghl/, tools/, mcp/) is portable between both.
 */
export interface Env {
  // Caches the Firebase ID token (key = KV_TOKEN_KEY) and the persisted
  // refresh token (key = "ghl_refresh_token", written once
  // GHL_FIREBASE_REFRESH_TOKEN rotates).
  tokenStore: TokenStore;

  // Required: the long-lived Firebase refresh token. Worker: set via
  // `wrangler secret put`. Local: set via the GHL_FIREBASE_REFRESH_TOKEN
  // env var (passed through the MCP client's server config, or a .env file).
  GHL_FIREBASE_REFRESH_TOKEN: string;

  // Optional: protects the Worker's /admin/* + /cli/token HTTP routes.
  // Unused in local/stdio mode (no HTTP routes exist there).
  ADMIN_API_KEY?: string;

  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  GHL_INTERNAL_BASE_URL: string;
  KV_TOKEN_KEY: string;
  KV_TOKEN_TTL_SECONDS: string;
  DEFAULT_LOCATION_ID?: string;
}
