import { getWorkflowMetadata, getWorkflowSteps } from "../ghl/workflow";
import { defineTool } from "./definition";
import { requireString, resolveLocationId } from "./helpers";

export const getStepsTool = defineTool({
  name: "ghl_workflow_builder_get_steps",
  description:
    "Get the action steps (templates array) for a workflow. Downloads them from Firebase Storage via the workflow's signed fileUrl -- the public API cannot return this.",
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
    const templates = await getWorkflowSteps(env, metadata);
    return { workflowId, version: metadata.version, stepCount: templates.length, templates };
  },
});
