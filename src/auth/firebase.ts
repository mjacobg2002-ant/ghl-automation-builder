/**
 * Firebase JWT refresh + token-store caching, per docs/auth.md "MCP Worker
 * Auto-Refresh Architecture". Cache-first: reads the cached ID token from the
 * runtime's TokenStore (Cloudflare KV when deployed, a local JSON file in
 * stdio mode); on a cache miss (or a downstream 401/403 in ghl/client.ts) it
 * exchanges the refresh token for a new ID token via the Firebase Secure
 * Token API and re-caches it with a TTL 5 minutes short of Firebase's real
 * ~60-minute expiry.
 */
import type { Env } from "../types/env";

const REFRESH_TOKEN_KV_KEY = "ghl_refresh_token";
const DEFAULT_TTL_SECONDS = 3300; // 55 minutes

interface FirebaseSecureTokenResponse {
  access_token: string;
  expires_in: string;
  token_type: string;
  refresh_token: string;
  id_token: string;
  user_id: string;
  project_id: string;
}

export interface RefreshedToken {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Exchanges a Firebase refresh token for a new ID token. Never expires on its own. */
export async function refreshFirebaseToken(env: Env, refreshToken: string): Promise<RefreshedToken> {
  const resp = await fetch(`https://securetoken.googleapis.com/v1/token?key=${env.FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Firebase token refresh failed (HTTP ${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as FirebaseSecureTokenResponse;
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in) || 3600,
  };
}

async function getRefreshToken(env: Env): Promise<string> {
  const storedToken = await env.tokenStore.get(REFRESH_TOKEN_KV_KEY);
  const token = storedToken || env.GHL_FIREBASE_REFRESH_TOKEN;
  if (!token) {
    throw new Error(
      "No Firebase refresh token available. Set the GHL_FIREBASE_REFRESH_TOKEN environment variable " +
        "(local stdio server) or secret (`wrangler secret put GHL_FIREBASE_REFRESH_TOKEN`, deployed Worker only), " +
        "or seed one via POST /admin/token/seed (Worker only)."
    );
  }
  return token;
}

/** Cache-first token retrieval: a token-store hit is fast, a miss triggers a refresh. */
export async function getValidToken(env: Env): Promise<string> {
  const cached = await env.tokenStore.get(env.KV_TOKEN_KEY);
  if (cached) return cached;
  return forceRefreshToken(env);
}

/** Unconditionally refreshes the ID token and re-caches it. Used on 401/403 retry and by /admin/token/refresh. */
export async function forceRefreshToken(env: Env): Promise<string> {
  const refreshToken = await getRefreshToken(env);
  const { idToken, refreshToken: newRefreshToken, expiresIn } = await refreshFirebaseToken(env, refreshToken);

  const configuredTtl = Number(env.KV_TOKEN_TTL_SECONDS) || DEFAULT_TTL_SECONDS;
  const ttl = Math.max(60, Math.min(expiresIn - 300, configuredTtl));
  await env.tokenStore.put(env.KV_TOKEN_KEY, idToken, { expirationTtl: ttl });

  // Firebase rotates the refresh token on each exchange; persist the new one
  // so future refreshes (and the GHL_FIREBASE_REFRESH_TOKEN secret, if never
  // updated) don't silently fall behind.
  if (newRefreshToken && newRefreshToken !== refreshToken) {
    await env.tokenStore.put(REFRESH_TOKEN_KV_KEY, newRefreshToken);
  }

  return idToken;
}

export interface DecodedTokenInfo {
  userId?: string;
  companyId?: string;
  locations?: string[];
  issuedAt?: number;
  expiresAt: number;
  expiresInSeconds: number;
}

/** Parses the (unverified -- we trust Firebase, we don't need to verify our own cached token) JWT payload for admin inspection. */
export function decodeJwtExpiry(token: string): DecodedTokenInfo | null {
  try {
    const parts = token.split(".");
    const payloadB64 = parts[1];
    if (!payloadB64) return null;
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(normalized)) as Record<string, unknown>;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const exp = typeof json.exp === "number" ? json.exp : 0;
    return {
      userId: typeof json.user_id === "string" ? json.user_id : undefined,
      companyId: typeof json.company_id === "string" ? json.company_id : undefined,
      locations: Array.isArray(json.locations) ? (json.locations as string[]) : undefined,
      issuedAt: typeof json.iat === "number" ? json.iat : undefined,
      expiresAt: exp,
      expiresInSeconds: exp - nowSeconds,
    };
  } catch {
    return null;
  }
}
