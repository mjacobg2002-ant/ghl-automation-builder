import { internalRequest } from "../ghl/client";
import { defineTool } from "./definition";
import { requireString, resolveLocationId } from "./helpers";

/** publish and draft are both thin wrappers over the same change-status endpoint (docs/api-reference.md "Change Workflow Status"). */
function changeStatusTool(status: "published" | "draft") {
  const verb = status === "published" ? "publish" : "draft";
  return defineTool({
    name: `ghl_workflow_builder_${verb}`,
    description: `${status === "published" ? "Publish" : "Set to draft"} a workflow via the change-status endpoint. Does not modify steps or triggers.`,
    inputSchema: {
      type: "object",
      required: ["workflowId", "updatedBy"],
      properties: {
        locationId: { type: "string" },
        workflowId: { type: "string" },
        updatedBy: { type: "string", description: "GHL user ID making the change (required by the API)." },
      },
    },
    async run(args, env) {
      const locationId = resolveLocationId(args, env);
      const workflowId = requireString(args, "workflowId");
      const updatedBy = requireString(args, "updatedBy");
      return internalRequest(env, {
        method: "PUT",
        path: `/workflow/${locationId}/change-status/${workflowId}`,
        body: { status, updatedBy },
      });
    },
  });
}

export const publishTool = changeStatusTool("published");
export const draftTool = changeStatusTool("draft");
