/**
 * Storage abstraction for the cached Firebase ID token + persisted refresh
 * token. Two runtimes implement this:
 *  - KvTokenStore (auth/kvTokenStore.ts) -- Cloudflare Workers KV, used when
 *    deployed.
 *  - FileTokenStore (local/fileTokenStore.ts) -- a JSON file on disk, used by
 *    the local stdio server (src/local/stdio.ts), which has no KV binding.
 * Everything else in the codebase (auth/firebase.ts, admin/routes.ts, all
 * tools) depends only on this interface, never on KVNamespace directly.
 */
export interface TokenStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
