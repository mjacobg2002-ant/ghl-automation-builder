import type { Env } from "./types/env";
import type { WorkerBindings } from "./worker/bindings";
import { KvTokenStore } from "./auth/kvTokenStore";
import { handleMcpRequest } from "./mcp/server";
import { handleAdminRoute } from "./admin/routes";

function toEnv(bindings: WorkerBindings): Env {
  return { ...bindings, tokenStore: new KvTokenStore(bindings.GHL_MCP_KV) };
}

export default {
  async fetch(request: Request, bindings: WorkerBindings): Promise<Response> {
    const env = toEnv(bindings);
    const url = new URL(request.url);

    // MCP JSON-RPC endpoint. Most MCP clients default to POST /, some expect /mcp -- both work.
    if (url.pathname === "/" || url.pathname === "/mcp") {
      return handleMcpRequest(request, env);
    }

    if (url.pathname.startsWith("/admin/") || url.pathname === "/cli/token") {
      return handleAdminRoute(request, env, url.pathname);
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<WorkerBindings>;
