import type { Env } from "./types/env";
import { handleMcpRequest } from "./mcp/server";
import { handleAdminRoute } from "./admin/routes";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
} satisfies ExportedHandler<Env>;
