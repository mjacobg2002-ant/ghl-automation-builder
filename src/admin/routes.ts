/**
 * Admin token-management endpoints, per docs/auth.md "Admin Token Management
 * Endpoints". Protected by an optional ADMIN_API_KEY secret -- if it's unset
 * the routes are open, which is fine for local `wrangler dev` but should
 * always be set before deploying (see README.md).
 */
import type { Env } from "../types/env";
import { decodeJwtExpiry, forceRefreshToken, getValidToken } from "../auth/firebase";

const REFRESH_TOKEN_KV_KEY = "ghl_refresh_token";

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.ADMIN_API_KEY) return true;
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token.length > 0 && token === env.ADMIN_API_KEY;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "Content-Type": "application/json" } });
}

export async function handleAdminRoute(request: Request, env: Env, pathname: string): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized. Set the `Authorization: Bearer <ADMIN_API_KEY>` header." }, 401);
  }

  if (pathname === "/admin/token/status" && request.method === "GET") {
    const cached = await env.tokenStore.get(env.KV_TOKEN_KEY);
    if (!cached) return json({ cached: false });
    return json({ cached: true, ...decodeJwtExpiry(cached) });
  }

  if (pathname === "/admin/token/refresh" && request.method === "POST") {
    const idToken = await forceRefreshToken(env);
    return json({ refreshed: true, ...decodeJwtExpiry(idToken) });
  }

  if (pathname === "/admin/token/seed" && request.method === "POST") {
    let body: { refreshToken?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body. Expected { refreshToken: string }." }, 400);
    }
    if (!body.refreshToken) return json({ error: '"refreshToken" is required' }, 400);

    await env.tokenStore.put(REFRESH_TOKEN_KV_KEY, body.refreshToken);
    await env.tokenStore.delete(env.KV_TOKEN_KEY); // force a fresh exchange on next use
    return json({ seeded: true });
  }

  if (pathname === "/cli/token" && request.method === "GET") {
    const token = await getValidToken(env);
    return json({ token });
  }

  return json({ error: "Not found" }, 404);
}
