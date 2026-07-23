/**
 * Node-only TokenStore backed by a single JSON file on disk, for the local
 * stdio server (no Cloudflare KV binding available outside a Worker). Not
 * imported by src/index.ts / the Worker build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TokenStore } from "../auth/tokenStore";

interface CacheEntry {
  value: string;
  expiresAt: number | null; // epoch ms, or null for no expiry
}

type CacheFile = Record<string, CacheEntry>;

export class FileTokenStore implements TokenStore {
  private readonly cachePath: string;

  constructor(cacheDir: string) {
    mkdirSync(cacheDir, { recursive: true });
    this.cachePath = join(cacheDir, "token-cache.json");
  }

  private readAll(): CacheFile {
    if (!existsSync(this.cachePath)) return {};
    try {
      return JSON.parse(readFileSync(this.cachePath, "utf8")) as CacheFile;
    } catch {
      return {};
    }
  }

  private writeAll(data: CacheFile): void {
    writeFileSync(this.cachePath, JSON.stringify(data, null, 2), "utf8");
  }

  async get(key: string): Promise<string | null> {
    const all = this.readAll();
    const entry = all[key];
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      delete all[key];
      this.writeAll(all);
      return null;
    }
    return entry.value;
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const all = this.readAll();
    all[key] = { value, expiresAt: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null };
    this.writeAll(all);
  }

  async delete(key: string): Promise<void> {
    const all = this.readAll();
    delete all[key];
    this.writeAll(all);
  }
}
