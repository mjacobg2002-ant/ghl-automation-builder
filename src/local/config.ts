/** Builds the runtime-agnostic Env from process.env, for the local stdio server. */
import { homedir } from "node:os";
import { join } from "node:path";
import type { Env } from "../types/env";
import { FileTokenStore } from "./fileTokenStore";

const DEFAULT_FIREBASE_API_KEY = "AIzaSyB_w3vXmsI7WeQtrIOkjR6xTRVN5uOieiE";
const DEFAULT_FIREBASE_PROJECT_ID = "highlevel-backend";
const DEFAULT_GHL_INTERNAL_BASE_URL = "https://backend.leadconnectorhq.com";
const DEFAULT_KV_TOKEN_KEY = "ghl_firebase_id_token";
const DEFAULT_KV_TOKEN_TTL_SECONDS = "3300";

export function loadLocalEnv(): Env {
  const refreshToken = process.env.GHL_FIREBASE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "GHL_FIREBASE_REFRESH_TOKEN is not set. Add it to the `env` block of this server's entry in your MCP " +
        "client config (see README.md \"Running Locally\"), or export it before running `npm run mcp:local` directly."
    );
  }

  const cacheDir = process.env.GHL_MCP_CACHE_DIR || join(homedir(), ".ghl-workflow-mcp");

  return {
    tokenStore: new FileTokenStore(cacheDir),
    GHL_FIREBASE_REFRESH_TOKEN: refreshToken,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || DEFAULT_FIREBASE_API_KEY,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID,
    GHL_INTERNAL_BASE_URL: process.env.GHL_INTERNAL_BASE_URL || DEFAULT_GHL_INTERNAL_BASE_URL,
    KV_TOKEN_KEY: process.env.KV_TOKEN_KEY || DEFAULT_KV_TOKEN_KEY,
    KV_TOKEN_TTL_SECONDS: process.env.KV_TOKEN_TTL_SECONDS || DEFAULT_KV_TOKEN_TTL_SECONDS,
    DEFAULT_LOCATION_ID: process.env.DEFAULT_LOCATION_ID || undefined,
  };
}
