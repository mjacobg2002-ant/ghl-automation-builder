/**
 * Reusable client for backend.leadconnectorhq.com (the internal workflow API),
 * per docs/api-reference.md and docs/auth.md. Every request carries the
 * `token-id` + `channel: APP` headers (NOT `Authorization: Bearer`), and a
 * single 401/403 triggers one forced token refresh + retry (docs/auth.md
 * "401/403 Auto-Retry").
 */
import type { Env } from "../types/env";
import { forceRefreshToken, getValidToken } from "../auth/firebase";

export class GhlApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(body !== undefined ? `${message} -- ${safeStringify(body)}` : message);
    this.name = "GhlApiError";
    this.status = status;
    this.body = body;
  }
}

export interface InternalRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string; // e.g. `/workflow/${locationId}/list`
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

function buildUrl(base: string, path: string, query?: InternalRequestOptions["query"]): string {
  const url = new URL(path, base);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function doFetch(env: Env, token: string, opts: InternalRequestOptions): Promise<Response> {
  const url = buildUrl(env.GHL_INTERNAL_BASE_URL, opts.path, opts.query);
  const headers: Record<string, string> = {
    "token-id": token,
    channel: "APP",
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  return fetch(url, { method: opts.method ?? "GET", headers, body });
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function parseBody(resp: Response): Promise<unknown> {
  const contentType = resp.headers.get("content-type") || "";
  const raw = await resp.text();
  if (!raw) return null;
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * Sends one authenticated request to the internal workflow API. Retries
 * exactly once on 401/403 with a force-refreshed token; a second failure is
 * thrown as a GhlApiError.
 */
export async function internalRequest<T = unknown>(env: Env, opts: InternalRequestOptions): Promise<T> {
  const token = await getValidToken(env);
  let resp = await doFetch(env, token, opts);

  if (resp.status === 401 || resp.status === 403) {
    const freshToken = await forceRefreshToken(env);
    resp = await doFetch(env, freshToken, opts);
  }

  const parsed = await parseBody(resp);

  if (!resp.ok) {
    throw new GhlApiError(resp.status, `GHL internal API ${opts.method ?? "GET"} ${opts.path} failed`, parsed);
  }

  return parsed as T;
}
