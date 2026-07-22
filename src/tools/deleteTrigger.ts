import { performAutoSave } from "../ghl/autosave";
import { internalRequest } from "../ghl/client";
import { getWorkflowMetadata, getWorkflowSteps, getWorkflowTriggers } from "../ghl/workflow";
import { defineTool } from "./definition";
import { optionalBoolean, requireString, resolveLocationId } from "./helpers";

export const deleteTriggerTool = defineTool({
  name: "ghl_workflow_builder_delete_trigger",
  description:
    "Delete a trigger from a workflow, then auto-save syncs the removal so it disappears from the advanced canvas. Set skipAutoSave to opt out.",
  inputSchema: {
    type: "object",
    required: ["workflowId", "triggerId"],
    properties: {
      locationId: { type: "string" },
      workflowId: { type: "string" },
      triggerId: { type: "string" },
      skipAutoSave: { type: "boolean" },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    const workflowId = requireString(args, "workflowId");
    const triggerId = requireString(args, "triggerId");

    const deleteResult = await internalRequest(env, {
      method: "DELETE",
      path: `/workflow/${locationId}/trigger/${triggerId}`,
    });

    let autoSaveResult: unknown = "skipped";
    if (!optionalBoolean(args, "skipAutoSave")) {
      const metadata = await getWorkflowMetadata(env, locationId, workflowId);
      const steps = await getWorkflowSteps(env, metadata);
      const existingTriggers = await getWorkflowTriggers(env, metadata);
      const remaining = existingTriggers.filter((t) => t.id !== triggerId);
      autoSaveResult = await performAutoSave(env, {
        locationId,
        workflowId,
        userId: metadata.updatedBy,
        templates: steps,
        triggers: remaining,
        oldTriggers: existingTriggers,
        version: metadata.version,
        status: metadata.status,
      });
    }

    return { delete: deleteResult, autoSave: autoSaveResult };
  },
});
