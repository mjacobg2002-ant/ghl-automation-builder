#!/usr/bin/env node
/**
 * Local stdio MCP server entry point. Reads newline-delimited JSON-RPC
 * requests from stdin, dispatches them through the same transport-agnostic
 * dispatchMcpRequest() the Cloudflare Worker uses, and writes newline-
 * delimited JSON-RPC responses to stdout. This is the standard local
 * transport MCP clients (Claude Code, Claude Desktop) spawn as a
 * subprocess -- see README.md "Running Locally" for the client config.
 *
 * stdout is reserved exclusively for JSON-RPC frames; all logging goes to
 * stderr so it never corrupts the protocol stream.
 */
import { createInterface } from "node:readline";
import type { Env } from "../types/env";
import { dispatchMcpRequest } from "../mcp/dispatch";
import type { JsonRpcRequest } from "../mcp/protocol";
import { loadLocalEnv } from "./config";

function log(...args: unknown[]): void {
  console.error("[ghl-workflow-mcp]", ...args);
}

async function handleLine(line: string, env: Env): Promise<void> {
  let payload: JsonRpcRequest;
  try {
    payload = JSON.parse(line);
  } catch {
    process.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: invalid JSON" } })}\n`
    );
    return;
  }

  const response = await dispatchMcpRequest(payload, env);
  if (response !== null) {
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

function main(): void {
  let env: Env;
  try {
    env = loadLocalEnv();
  } catch (err) {
    log("Failed to start:", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: process.stdin, terminal: false });

  // Tool calls do real network I/O (Firebase refresh, GHL API, Firebase Storage)
  // and can easily outlive a single synchronous pass over buffered stdin lines.
  // Track in-flight requests so `end` doesn't exit the process out from under
  // a still-pending response.
  const pending = new Set<Promise<void>>();

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const task = handleLine(trimmed, env).catch((err) => log("Unhandled dispatch error:", err));
    pending.add(task);
    void task.finally(() => pending.delete(task));
  });

  process.stdin.on("end", () => {
    void Promise.allSettled(pending).then(() => process.exit(0));
  });

  log("ghl-workflow-mcp local stdio server ready");
}

main();
