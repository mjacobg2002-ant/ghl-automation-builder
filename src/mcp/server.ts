/**
 * Hand-rolled MCP Streamable HTTP server, stateless variant: every request is
 * a self-contained JSON-RPC call handled independently (no session ID, no
 * SSE stream) since none of these tools are long-running. This sidesteps the
 * official @modelcontextprotocol/sdk's transport layer, which historically
 * assumes a Node http.IncomingMessage/ServerResponse pair and does not run
 * reliably against the Workers runtime's Web-standard Request/Response.
 *
 * Supported methods: initialize, notifications/initialized, ping, tools/list,
 * tools/call. Anything else returns a JSON-RPC "method not found" error (or,
 * for notifications, a bare 202 -- notifications never get a JSON-RPC error
 * body per spec).
 */
import type { Env } from "../types/env";
import { TOOLS, TOOLS_BY_NAME } from "../tools/registry";
import { JSON_RPC_ERRORS, type JsonRpcRequest } from "./protocol";

const SERVER_INFO = { name: "ghl-workflow-mcp", version: "1.0.0" };
const FALLBACK_PROTOCOL_VERSION = "2025-06-18";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id, Accept",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function rpcResult(id: string | number | null | undefined, result: unknown): Response {
  return jsonResponse({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(id: string | number | null | undefined, code: number, message: string, data?: unknown): Response {
  return jsonResponse({ jsonrpc: "2.0", id: id ?? null, error: { code, message, data } });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method === "GET") {
    return new Response(
      "This MCP server does not support server-initiated SSE streams. POST JSON-RPC 2.0 requests to this endpoint instead.",
      { status: 405, headers: { Allow: "POST, OPTIONS", ...CORS_HEADERS } }
    );
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST, OPTIONS", ...CORS_HEADERS } });
  }

  let payload: JsonRpcRequest;
  try {
    payload = await request.json();
  } catch {
    return rpcError(null, JSON_RPC_ERRORS.PARSE_ERROR, "Parse error: invalid JSON body");
  }

  if (!payload || typeof payload.method !== "string") {
    return rpcError(payload?.id ?? null, JSON_RPC_ERRORS.INVALID_REQUEST, "Invalid Request: missing `method`");
  }

  const { id, method, params } = payload;
  const isNotification = id === undefined;

  try {
    switch (method) {
      case "initialize": {
        const clientProtocolVersion = typeof params?.protocolVersion === "string" ? params.protocolVersion : FALLBACK_PROTOCOL_VERSION;
        return rpcResult(id, {
          protocolVersion: clientProtocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions:
            "Tools for programmatic GHL workflow management (full CRUD on workflows, steps, and triggers via the reverse-engineered internal API). " +
            "All tools accept `locationId`; omit it to use the server's DEFAULT_LOCATION_ID if configured. " +
            "save_steps / create_trigger / update_trigger / delete_trigger / clone automatically run an advanced-canvas auto-save sync afterward -- pass skipAutoSave: true to opt out.",
        });
      }

      case "notifications/initialized":
      case "notifications/cancelled":
        return new Response(null, { status: 202, headers: CORS_HEADERS });

      case "ping":
        return rpcResult(id, {});

      case "tools/list":
        return rpcResult(id, {
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        });

      case "tools/call": {
        const toolName = params?.name;
        if (typeof toolName !== "string") {
          return rpcError(id, JSON_RPC_ERRORS.INVALID_PARAMS, "Invalid params: `name` is required");
        }
        const tool = TOOLS_BY_NAME.get(toolName);
        if (!tool) {
          return rpcResult(id, {
            content: [{ type: "text", text: `Unknown tool: "${toolName}". Call tools/list for the available set.` }],
            isError: true,
          });
        }
        const args = (params?.arguments as Record<string, unknown>) ?? {};
        const result = await tool.handler(args, env);
        return rpcResult(id, result);
      }

      default:
        if (isNotification) return new Response(null, { status: 202, headers: CORS_HEADERS });
        return rpcError(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  } catch (err) {
    if (isNotification) return new Response(null, { status: 202, headers: CORS_HEADERS });
    return rpcError(id, JSON_RPC_ERRORS.INTERNAL_ERROR, `Internal error: ${errorMessage(err)}`);
  }
}
