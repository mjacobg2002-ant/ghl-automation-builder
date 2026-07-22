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

Firebase JWT via `token-id` header. Refresh token never expires, stored as Cloudflare secret. Auto-refresh with 55-min KV cache. See `docs/auth.md`.

## Key Limitation

Firebase JWT is scoped per-user/location. Current token covers Christians Testing only. Need separate tokens for DLF, TVAAI, etc.

## Deploying the MCP Server

`src/` contains a complete, buildable TypeScript Cloudflare Worker implementing all 16 tools above as an MCP server (hand-rolled JSON-RPC / Streamable HTTP transport -- stateless, no SSE, since none of these tools are long-running).

### 1. Install dependencies

```bash
npm install
```

### 2. Create the KV namespace

The worker caches the Firebase ID token (55-min TTL) and the persisted refresh token in a KV namespace:

```bash
npx wrangler kv namespace create GHL_MCP_KV
npx wrangler kv namespace create GHL_MCP_KV --preview
```

Copy the two `id` values it prints into `wrangler.toml`'s `[[kv_namespaces]]` block (`id` and `preview_id`).

### 3. Set secrets

```bash
# Required -- see docs/auth.md "Extracting a New Refresh Token" for how to obtain one.
npx wrangler secret put GHL_FIREBASE_REFRESH_TOKEN

# Strongly recommended -- protects /admin/* and /cli/token once deployed.
npx wrangler secret put ADMIN_API_KEY
```

### 4. (Optional) Set a default location

If most of your workflow work targets one location, set `DEFAULT_LOCATION_ID` in `wrangler.toml`'s `[vars]` block so tools can omit `locationId`. Otherwise every tool call must pass it explicitly.

### 5. Typecheck, run locally, deploy

```bash
npm run typecheck   # tsc --noEmit
npm run dev          # wrangler dev -- MCP endpoint at http://localhost:8787/
npm run deploy       # wrangler deploy
```

### 6. Point an MCP client at it

The deployed Worker's root URL (`https://<your-worker>.<subdomain>.workers.dev/`, or `/mcp`) is a standard MCP Streamable HTTP endpoint: POST JSON-RPC 2.0 requests (`initialize`, `tools/list`, `tools/call`). Add it as a remote MCP server in Claude Code / Claude Desktop / any MCP-compatible client.

### Other endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/` or `/mcp` | POST | MCP JSON-RPC endpoint (the 16 tools) |
| `/health` | GET | Liveness check |
| `/admin/token/status` | GET | Inspect the cached Firebase token's expiry |
| `/admin/token/refresh` | POST | Force a token refresh |
| `/admin/token/seed` | POST | Store a new refresh token (`{"refreshToken": "..."}`) if the old one is revoked |
| `/cli/token` | GET | Return the cached ID token, for ad-hoc `curl`/script use |

All `/admin/*` and `/cli/token` routes require `Authorization: Bearer <ADMIN_API_KEY>` once that secret is set.

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
