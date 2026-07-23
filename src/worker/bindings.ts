/** Raw Cloudflare Worker bindings, as declared in wrangler.toml. Only src/index.ts touches this -- everything else uses the runtime-agnostic Env (src/types/env.ts). */
export interface WorkerBindings {
  GHL_MCP_KV: KVNamespace;
  GHL_FIREBASE_REFRESH_TOKEN: string;
  ADMIN_API_KEY?: string;
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  GHL_INTERNAL_BASE_URL: string;
  KV_TOKEN_KEY: string;
  KV_TOKEN_TTL_SECONDS: string;
  DEFAULT_LOCATION_ID?: string;
}
