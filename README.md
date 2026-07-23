# GHL Automation Builder

Programmatic workflow builder for GoHighLevel. Full CRUD on workflows, triggers, actions, steps, and branches via reverse-engineered internal API.

## What This Is

GHL's public API only exposes `GET /workflows/` (list metadata). No create, update, delete, or step content. The community has 122+ votes requesting this. We reverse-engineered the internal API and built 16 MCP tools that give full programmatic control.

## Architecture

```
Claude Code Skills/Agents
    │
    ├── MCP Tools (16 workflow builder tools)
    │   └── dlf-agency Cloudflare Worker
    │       ├── Firebase JWT Auth (auto-refresh via KV)
    │       └── backend.leadconnectorhq.com (internal API)
    │
    ├── GHL Internal API
    │   ├── Workflow CRUD (MongoDB metadata)
    │   ├── Trigger CRUD (Firebase Storage)
    │   └── Action Steps (Firebase Storage)
    │
    └── New Workflow Builder v2 (separate microfrontend)
        └── Loaded via workflowServiceURL at runtime
```

## Folder Structure

| Path | Purpose |
|------|---------|
| `docs/` | Architecture, auth, API reference, platform research |
| `schemas/` | Complete action/trigger type schemas with attribute definitions |
| `scripts/` | Token retrieval, verification pipeline scripts |
| `verified/` | Confirmed API type strings from live workflow data |
| `src/` | The Cloudflare Worker MCP server implementation (see below) |

## Available MCP Tools (16 total)

All tools prefixed `ghl_workflow_builder_*` on the `dlf-agency` worker.

| Tool | What it does |
|------|-------------|
| `list` | List workflows/folders in a location |
| `create` | Create a new workflow |
| `get` | Get workflow metadata |
| `get_steps` | Get action steps (templates) from Firebase Storage |
| `get_triggers` | Get trigger configs from Firebase Storage |
| `update` | Update workflow name/settings (version required) |
| `save_steps` | Save action steps (JSON templates array) |
| `publish` | Publish a workflow |
| `draft` | Set workflow to draft |
| `delete` | Delete a workflow |
| `create_trigger` | Create a trigger |
| `update_trigger` | Update a trigger |
| `delete_trigger` | Delete a trigger |
| `create_folder` | Create a folder |
| `clone` | Clone a workflow (read + remap UUIDs + recreate) |
| `error_count` | Get error notification count |

## Quick Reference

- **95 action types** across 14 categories
- **93 trigger types** across 14 categories
- **22 condition operators**
- **100+ template variables** across 12 namespaces
- **39 message types** (TYPE_CALL through TYPE_NO_SHOW)
- **17 confirmed** API type strings (live captures)
- **21 additional confirmed** from campaign builder JS source

## Auth

Firebase JWT via `token-id` header (the internal API), never the public API's `Authorization: Bearer` PIT/OAuth flow. The refresh token itself never expires; the ID token it produces auto-refreshes every ~55 minutes. Running locally, both live in a plain env var + a local JSON cache file; deployed to Cloudflare, they live in a secret + KV. See `docs/auth.md` and "Running Locally" below.

## Key Limitation

Firebase JWT is scoped per-user/location. Current token covers Christians Testing only. Need separate tokens for DLF, TVAAI, etc.

## Running Locally (recommended first — no Cloudflare account needed)

`src/` contains a complete TypeScript MCP server implementing all 16 tools above. It has **two entry points that share all the same code** (auth, API client, registries, tools, MCP protocol dispatch) and differ only in transport and where the token cache lives:

| Entry point | Transport | Token cache | Requires |
|---|---|---|---|
| `src/local/stdio.ts` | stdio (newline-delimited JSON-RPC over stdin/stdout) | local JSON file (`~/.ghl-workflow-mcp/token-cache.json` by default) | nothing but Node + a GHL refresh token |
| `src/index.ts` | HTTP (Streamable HTTP, for Cloudflare) | Workers KV | a Cloudflare account + deployment (see next section) |

For "Claude Code/Desktop → local MCP server → GoHighLevel", use the stdio entry point. Nothing is deployed or created in Cloudflare.

### 1. Install dependencies

```bash
npm install
```

### 2. What this uses (and doesn't)

- **GHL internal API via Firebase JWT** (`token-id` header on `backend.leadconnectorhq.com`), *not* the public GHL Private Integration/OAuth v2 API -- that one is read-only (`GET /workflows/` metadata only, no create/update/publish/steps/triggers). See `docs/auth.md` and `docs/api-overview.md` for why.
- **No Cloudflare secrets in local mode.** The refresh token is read from the `GHL_FIREBASE_REFRESH_TOKEN` environment variable (set in your MCP client's server config, below) and the ID-token cache is a plain JSON file on disk -- there is no KV namespace, no Worker, nothing deployed.

### 3. The one required credential

| Variable | Required? | What it is |
|---|---|---|
| `GHL_FIREBASE_REFRESH_TOKEN` | **Yes** | Long-lived Firebase refresh token for your GHL user. Extract it per `docs/auth.md` "Extracting a New Refresh Token" (DevTools → Application → IndexedDB → `firebaseLocalStorageDb` while logged into `app.gohighlevel.com`). This is a real credential -- get it yourself; nothing in this repo can generate or guess it. |
| `DEFAULT_LOCATION_ID` | Optional | GHL location ID, so tool calls can omit `locationId`. |
| `GHL_MCP_CACHE_DIR` | Optional | Where the local token-cache JSON file lives. Defaults to `~/.ghl-workflow-mcp`. |
| `ADMIN_API_KEY` | Not used locally | Only relevant to the HTTP/Worker entry point's `/admin/*` routes. |

Everything else (`FIREBASE_API_KEY`, `GHL_INTERNAL_BASE_URL`, etc.) has a working default baked in and never needs to be set.

### 4. Typecheck and smoke-test

```bash
npm run typecheck        # both the Worker build and the local/stdio build
GHL_FIREBASE_REFRESH_TOKEN=your-token npm run mcp:local   # runs the stdio server; Ctrl-D on an empty line to stop
```

It logs `ghl-workflow-mcp local stdio server ready` to stderr and then waits for JSON-RPC requests on stdin -- that's normal, it's meant to be driven by an MCP client, not a human.

### 5. Connect it to Claude Code

Project-scoped config (`.mcp.json` in the repo root):

```json
{
  "mcpServers": {
    "ghl-workflow-builder": {
      "command": "npx",
      "args": ["tsx", "src/local/stdio.ts"],
      "cwd": "/absolute/path/to/this/repo",
      "env": {
        "GHL_FIREBASE_REFRESH_TOKEN": "your-firebase-refresh-token",
        "DEFAULT_LOCATION_ID": "your-ghl-location-id"
      }
    }
  }
}
```

Or via the CLI:

```bash
claude mcp add ghl-workflow-builder \
  --env GHL_FIREBASE_REFRESH_TOKEN=your-firebase-refresh-token \
  --env DEFAULT_LOCATION_ID=your-ghl-location-id \
  -- npx tsx /absolute/path/to/this/repo/src/local/stdio.ts
```

### 6. Connect it to Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ghl-workflow-builder": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/this/repo/src/local/stdio.ts"],
      "env": {
        "GHL_FIREBASE_REFRESH_TOKEN": "your-firebase-refresh-token",
        "DEFAULT_LOCATION_ID": "your-ghl-location-id"
      }
    }
  }
}
```

Restart the client after editing config. Once connected, `tools/list` should show all 16 `ghl_workflow_builder_*` tools, and you can ask Claude to e.g. "create a GHL workflow that follows up with new leads."

## Deploying to Cloudflare (optional, later)

`src/index.ts` is a complete, buildable Cloudflare Worker exposing the same 16 tools over HTTP (hand-rolled JSON-RPC / Streamable HTTP transport -- stateless, no SSE, since none of these tools are long-running). Do this only once local testing works and you actually want the server always-on/remotely reachable rather than spawned locally per Claude session.

### 1. Create the KV namespace

The worker caches the Firebase ID token (55-min TTL) and the persisted refresh token in a KV namespace:

```bash
npx wrangler kv namespace create GHL_MCP_KV
npx wrangler kv namespace create GHL_MCP_KV --preview
```

Copy the two `id` values it prints into `wrangler.toml`'s `[[kv_namespaces]]` block (`id` and `preview_id`).

### 2. Set secrets

```bash
# Required -- same GHL_FIREBASE_REFRESH_TOKEN value as local mode.
npx wrangler secret put GHL_FIREBASE_REFRESH_TOKEN

# Strongly recommended -- protects /admin/* and /cli/token once deployed.
npx wrangler secret put ADMIN_API_KEY
```

### 3. (Optional) Set a default location

If most of your workflow work targets one location, set `DEFAULT_LOCATION_ID` in `wrangler.toml`'s `[vars]` block so tools can omit `locationId`. Otherwise every tool call must pass it explicitly.

### 4. Run locally against real Cloudflare bindings, then deploy

```bash
npm run dev          # wrangler dev -- MCP endpoint at http://localhost:8787/
npm run deploy       # wrangler deploy
```

### 5. Point an MCP client at it

The deployed Worker's root URL (`https://<your-worker>.<subdomain>.workers.dev/`, or `/mcp`) is a standard MCP Streamable HTTP endpoint: POST JSON-RPC 2.0 requests (`initialize`, `tools/list`, `tools/call`). Add it as a remote MCP server (`claude mcp add --transport http ...`) instead of the stdio command above.

### Other endpoints (Worker only)

| Route | Method | Purpose |
|-------|--------|---------|
| `/` or `/mcp` | POST | MCP JSON-RPC endpoint (the 16 tools) |
| `/health` | GET | Liveness check |
| `/admin/token/status` | GET | Inspect the cached Firebase token's expiry |
| `/admin/token/refresh` | POST | Force a token refresh |
| `/admin/token/seed` | POST | Store a new refresh token (`{"refreshToken": "..."}`) if the old one is revoked |
| `/cli/token` | GET | Return the cached ID token, for ad-hoc `curl`/script use |

All `/admin/*` and `/cli/token` routes require `Authorization: Bearer <ADMIN_API_KEY>` once that secret is set. None of this exists in local/stdio mode -- there's no HTTP server to route to.

## Next Steps

1. Run verification pipeline (create test workflows with each action/trigger type) to promote more registry entries from `confirmed: false` to `confirmed: true`
2. Discover workflow builder v2 service URL
3. Build Claude Code skill for easy workflow management commands

## Sources

- Reverse-engineered from `app.gohighlevel.com` network traffic (2026-03-18)
- GHL frontend JS bundles (`static.leadconnectorhq.com/1190/app.js`)
- GHL help center (complete action/trigger lists)
- Open-source community MCP implementations
- GHL marketplace documentation
