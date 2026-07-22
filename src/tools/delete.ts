import { internalRequest } from "../ghl/client";
import { defineTool } from "./definition";
import { requireString, resolveLocationId } from "./helpers";

export const deleteTool = defineTool({
  name: "ghl_workflow_builder_delete",
  description: "Permanently delete a workflow. This cannot be undone.",
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
    return internalRequest(env, { method: "DELETE", path: `/workflow/${locationId}/${workflowId}` });
  },
});
