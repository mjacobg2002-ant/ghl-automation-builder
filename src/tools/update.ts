import { internalRequest } from "../ghl/client";
import { getWorkflowMetadata } from "../ghl/workflow";
import { defineTool } from "./definition";
import { optionalNumber, optionalString, requireString, resolveLocationId } from "./helpers";

const PASSTHROUGH_BOOLEAN_FIELDS = ["allowMultiple", "removeContactFromLastStep", "stopOnResponse", "autoMarkAsRead"] as const;

export const updateTool = defineTool({
  name: "ghl_workflow_builder_update",
  description:
    "Update workflow name and/or settings (version is required by the API and auto-fetched via GET if not supplied). To update action steps use save_steps instead -- it also keeps the advanced canvas in sync.",
  inputSchema: {
    type: "object",
    required: ["workflowId"],
    properties: {
      locationId: { type: "string" },
      workflowId: { type: "string" },
      version: { type: "number", description: "Current version. Auto-fetched via GET if omitted." },
      name: { type: "string" },
      timezone: { type: "string", description: '"account" or an IANA timezone.' },
      allowMultiple: { type: "boolean", description: "Allow a contact in the workflow multiple times simultaneously." },
      removeContactFromLastStep: { type: "boolean" },
      stopOnResponse: { type: "boolean" },
      autoMarkAsRead: { type: "boolean" },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    const workflowId = requireString(args, "workflowId");

    let version = optionalNumber(args, "version");
    if (version === undefined) {
      const current = await getWorkflowMetadata(env, locationId, workflowId);
      version = current.version;
    }

    const body: Record<string, unknown> = { version };
    const name = optionalString(args, "name");
    if (name) body.name = name;
    const timezone = optionalString(args, "timezone");
    if (timezone) body.timezone = timezone;
    for (const key of PASSTHROUGH_BOOLEAN_FIELDS) {
      if (typeof args[key] === "boolean") body[key] = args[key];
    }

    return internalRequest(env, { method: "PUT", path: `/workflow/${locationId}/${workflowId}`, body });
  },
});
