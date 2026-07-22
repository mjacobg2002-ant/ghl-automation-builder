import { internalRequest } from "../ghl/client";
import { defineTool } from "./definition";
import { resolveLocationId } from "./helpers";

export const errorCountTool = defineTool({
  name: "ghl_workflow_builder_error_count",
  description: "Get the count of workflow execution errors for a location.",
  inputSchema: {
    type: "object",
    properties: {
      locationId: { type: "string" },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    return internalRequest(env, { path: `/workflow/${locationId}/error-notification/count` });
  },
});
