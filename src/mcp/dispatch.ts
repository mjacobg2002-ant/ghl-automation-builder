/**
 * Transport-agnostic MCP JSON-RPC dispatch. Both the HTTP Worker transport
 * (mcp/server.ts) and the local stdio transport (local/stdio.ts) call this;
 * neither reimplements protocol logic.
 *
 * Supported methods: initialize, notifications/initialized,
 * notifications/cancelled, ping, tools/list, tools/call. Returns null for
 * notifications (id === undefined) -- callers must send no response at all
 * for those, per the JSON-RPC/MCP spec.
 */
import type { Env } from "../types/env";
import { TOOLS, TOOLS_BY_NAME } from "../tools/registry";
import { JSON_RPC_ERRORS, type JsonRpcErrorBody, type JsonRpcRequest, type JsonRpcSuccess } from "./protocol";

const SERVER_INFO = { name: "ghl-workflow-mcp", version: "1.0.0" };
const FALLBACK_PROTOCOL_VERSION = "2025-06-18";

function success(id: string | number | null | undefined, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function failure(id: string | number | null | undefined, code: number, message: string, data?: unknown): JsonRpcErrorBody {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data } };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function dispatchMcpRequest(payload: JsonRpcRequest, env: Env): Promise<JsonRpcSuccess | JsonRpcErrorBody | null> {
  if (!payload || typeof payload.method !== "string") {
    return failure(payload?.id ?? null, JSON_RPC_ERRORS.INVALID_REQUEST, "Invalid Request: missing `method`");
  }

  const { id, method, params } = payload;
  const isNotification = id === undefined;

  try {
    switch (method) {
      case "initialize": {
        const clientProtocolVersion = typeof params?.protocolVersion === "string" ? params.protocolVersion : FALLBACK_PROTOCOL_VERSION;
        return success(id, {
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
        return null;

      case "ping":
        return success(id, {});

      case "tools/list":
        return success(id, {
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        });

      case "tools/call": {
        const toolName = params?.name;
        if (typeof toolName !== "string") {
          return failure(id, JSON_RPC_ERRORS.INVALID_PARAMS, "Invalid params: `name` is required");
        }
        const tool = TOOLS_BY_NAME.get(toolName);
        if (!tool) {
          return success(id, {
            content: [{ type: "text", text: `Unknown tool: "${toolName}". Call tools/list for the available set.` }],
            isError: true,
          });
        }
        const args = (params?.arguments as Record<string, unknown>) ?? {};
        const result = await tool.handler(args, env);
        return success(id, result);
      }

      default:
        if (isNotification) return null;
        return failure(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  } catch (err) {
    if (isNotification) return null;
    return failure(id, JSON_RPC_ERRORS.INTERNAL_ERROR, `Internal error: ${errorMessage(err)}`);
  }
}
