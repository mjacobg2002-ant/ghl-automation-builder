import { resolveActionType } from "../registry/actionTypes";
import type { ActionStep } from "../ghl/types";
import { generateUuid } from "../util/uuid";
import { ToolInputError } from "./helpers";

export interface NormalizeTemplatesResult {
  templates: ActionStep[];
  warnings: string[];
}

/** Validates raw template input, applies known action-type string corrections, and fills in missing step IDs. */
export function normalizeTemplates(rawTemplates: unknown): NormalizeTemplatesResult {
  if (rawTemplates === undefined) return { templates: [], warnings: [] };
  if (!Array.isArray(rawTemplates)) {
    throw new ToolInputError('"templates" must be an array of action step objects');
  }

  const warnings: string[] = [];
  const templates = rawTemplates.map((raw, idx) => {
    if (typeof raw !== "object" || raw === null) {
      throw new ToolInputError(`templates[${idx}] must be an object`);
    }
    const step = raw as Partial<ActionStep>;
    if (typeof step.type !== "string" || step.type.length === 0) {
      throw new ToolInputError(`templates[${idx}] is missing a "type" string`);
    }

    const { type: resolvedType, corrected, info } = resolveActionType(step.type);
    if (corrected) {
      warnings.push(`Corrected action type "${step.type}" -> "${resolvedType}" (see CLAUDE.md gotchas / registry notes).`);
    } else if (!info) {
      warnings.push(
        `Action type "${step.type}" is not in the known registry (unconfirmed or custom). Passing it through as-is -- ` +
          'GHL\'s save API validates type strings strictly and will reject unknown ones with "corrupted type".'
      );
    } else if (!info.confirmed) {
      warnings.push(`Action type "${resolvedType}" (${info.uiName}) is inferred, not live-verified. ${info.notes ?? ""}`.trim());
    }

    return {
      ...step,
      id: step.id || generateUuid(),
      order: step.order ?? idx,
      name: step.name ?? info?.uiName ?? resolvedType,
      type: resolvedType,
      attributes: step.attributes ?? {},
      next: step.next ?? null,
      parentKey: step.parentKey ?? null,
    } as ActionStep;
  });

  return { templates, warnings };
}
