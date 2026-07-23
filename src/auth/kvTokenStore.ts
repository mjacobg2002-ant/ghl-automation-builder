import type { TokenStore } from "./tokenStore";

/** Worker-only TokenStore backed by a Cloudflare KV namespace. Not imported by the local stdio server. */
export class KvTokenStore implements TokenStore {
  constructor(private readonly kv: KVNamespace) {}

  get(key: string): Promise<string | null> {
    return this.kv.get(key);
  }

  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    return this.kv.put(key, value, opts);
  }

  delete(key: string): Promise<void> {
    return this.kv.delete(key);
  }
}
