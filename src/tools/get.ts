import { getWorkflowMetadata } from "../ghl/workflow";
import { defineTool } from "./definition";
import { requireString, resolveLocationId } from "./helpers";

export const getTool = defineTool({
  name: "ghl_workflow_builder_get",
  description:
    "Get workflow metadata: name, status, version, timestamps, permission, fileUrl/triggersFilePath pointers. Does not include action steps or triggers -- use get_steps / get_triggers for those.",
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
    return getWorkflowMetadata(env, locationId, workflowId);
  },
});
