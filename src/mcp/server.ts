/**
 * HTTP transport for the MCP JSON-RPC dispatcher (dispatch.ts), for the
 * Cloudflare Worker deployment. Stateless Streamable HTTP: every request is a
 * self-contained JSON-RPC call handled independently (no session ID, no SSE
 * stream) since none of these tools are long-running.
 *
 * This sidesteps the official @modelcontextprotocol/sdk's transport layer,
 * which historically assumes a Node http.IncomingMessage/ServerResponse pair
 * and does not run reliably against the Workers runtime's Web-standard
 * Request/Response. The local stdio transport (local/stdio.ts) reuses the
 * same dispatch.ts over a different transport.
 */
import type { Env } from "../types/env";
import { dispatchMcpRequest } from "./dispatch";
import { JSON_RPC_ERRORS, type JsonRpcRequest } from "./protocol";

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
    return jsonResponse({ jsonrpc: "2.0", id: null, error: { code: JSON_RPC_ERRORS.PARSE_ERROR, message: "Parse error: invalid JSON body" } });
  }

  const response = await dispatchMcpRequest(payload, env);
  if (response === null) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }
  return jsonResponse(response);
}
