import { getWorkflowMetadata, getWorkflowTriggers } from "../ghl/workflow";
import { defineTool } from "./definition";
import { requireString, resolveLocationId } from "./helpers";

export const getTriggersTool = defineTool({
  name: "ghl_workflow_builder_get_triggers",
  description:
    "Get trigger configs for a workflow, downloaded from Firebase Storage via triggersFilePath (there is no REST GET for triggers). Note: triggers only appear here after an auto-save sync has run -- create_trigger/update_trigger/delete_trigger in this server do that automatically unless skipAutoSave is set.",
  inputSchema: {
    type: "object",
    required: ["workflowId"],
    properties: {
      locationId: { type: "string" },
      workflowId: { type: "string" },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    const workflowId = requireString(args, "workflowId");
    const metadata = await getWorkflowMetadata(env, locationId, workflowId);
    const triggers = await getWorkflowTriggers(env, metadata);
    return { workflowId, triggerCount: triggers.length, triggers };
  },
});
