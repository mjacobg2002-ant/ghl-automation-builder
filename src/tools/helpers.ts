import type { Env } from "../types/env";

export class ToolInputError extends Error {}

export function requireString(args: Record<string, unknown>, key: string, fallback?: string): string {
  const value = args[key];
  if (typeof value === "string" && value.length > 0) return value;
  if (fallback) return fallback;
  throw new ToolInputError(`Missing required parameter: "${key}"`);
}

export function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function optionalNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function optionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

/** Resolves locationId from args, falling back to the worker's DEFAULT_LOCATION_ID var if configured. */
export function resolveLocationId(args: Record<string, unknown>, env: Env): string {
  return requireString(args, "locationId", env.DEFAULT_LOCATION_ID || undefined);
}
