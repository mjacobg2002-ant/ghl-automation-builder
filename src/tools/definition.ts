import type { Env } from "../types/env";
import { GhlApiError } from "../ghl/client";
import { ToolInputError } from "./helpers";

export interface ToolContentBlock {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: ToolContentBlock[];
  isError?: boolean;
}

/** JSON Schema for a tool's `arguments` object, as returned by tools/list. */
export type JsonSchema = Record<string, unknown>;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (args: Record<string, unknown>, env: Env) => Promise<ToolResult>;
}

function toolText(text: string, isError = false): ToolResult {
  return { content: [{ type: "text", text }], isError };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

interface DefineToolSpec {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  /** Returns arbitrary JSON-serializable data on success. Throw ToolInputError for bad args, or let GhlApiError / any Error propagate -- both are caught and surfaced as tool-level errors (isError: true) rather than protocol-level failures. */
  run: (args: Record<string, unknown>, env: Env) => Promise<unknown>;
}

/** Wraps a `run` function into a full ToolDefinition with uniform error handling. */
export function defineTool(spec: DefineToolSpec): ToolDefinition {
  return {
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema,
    async handler(args, env) {
      try {
        const result = await spec.run(args, env);
        return toolText(JSON.stringify(result, null, 2));
      } catch (err) {
        if (err instanceof ToolInputError) return toolText(`Invalid input: ${err.message}`, true);
        if (err instanceof GhlApiError) return toolText(err.message, true);
        return toolText(`Unexpected error: ${errorMessage(err)}`, true);
      }
    },
  };
}
