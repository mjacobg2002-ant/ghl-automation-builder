import { performAutoSave } from "../ghl/autosave";
import { internalRequest } from "../ghl/client";
import { getWorkflowMetadata, getWorkflowSteps, getWorkflowTriggers } from "../ghl/workflow";
import { defineTool } from "./definition";
import { optionalBoolean, requireString, resolveLocationId } from "./helpers";

const PASSTHROUGH_FIELDS = ["name", "active", "targetActionId"] as const;

export const updateTriggerTool = defineTool({
  name: "ghl_workflow_builder_update_trigger",
  description:
    "Update an existing trigger's configuration (name, active, conditions, targetActionId), then auto-save syncs the change to the advanced canvas. Set skipAutoSave to opt out.",
  inputSchema: {
    type: "object",
    required: ["workflowId", "triggerId"],
    properties: {
      locationId: { type: "string" },
      workflowId: { type: "string" },
      triggerId: { type: "string" },
      name: { type: "string" },
      active: { type: "boolean" },
      conditions: { type: "array", items: { type: "object" } },
      targetActionId: { type: "string" },
      skipAutoSave: { type: "boolean" },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    const workflowId = requireString(args, "workflowId");
    const triggerId = requireString(args, "triggerId");

    const body: Record<string, unknown> = {};
    for (const key of PASSTHROUGH_FIELDS) {
      if (args[key] !== undefined) body[key] = args[key];
    }
    if (Array.isArray(args.conditions)) body.conditions = args.conditions;

    const updateResult = await internalRequest(env, {
      method: "PUT",
      path: `/workflow/${locationId}/trigger/${triggerId}`,
      body,
    });

    let autoSaveResult: unknown = "skipped";
    if (!optionalBoolean(args, "skipAutoSave")) {
      const metadata = await getWorkflowMetadata(env, locationId, workflowId);
      const steps = await getWorkflowSteps(env, metadata);
      const existingTriggers = await getWorkflowTriggers(env, metadata);
      const merged = existingTriggers.map((t) => (t.id === triggerId ? { ...t, ...body } : t));
      autoSaveResult = await performAutoSave(env, {
        locationId,
        workflowId,
        name: metadata.name,
        userId: metadata.updatedBy,
        templates: steps,
        triggers: merged,
        oldTriggers: existingTriggers,
        version: metadata.version,
        status: metadata.status,
      });
    }

    return { update: updateResult, autoSave: autoSaveResult };
  },
});
