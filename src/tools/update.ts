import { internalRequest } from "../ghl/client";
import { extractPersistentFields, getWorkflowMetadata, getWorkflowSteps } from "../ghl/workflow";
import { defineTool } from "./definition";
import { optionalNumber, optionalString, requireString, resolveLocationId } from "./helpers";

const PASSTHROUGH_BOOLEAN_FIELDS = ["allowMultiple", "removeContactFromLastStep", "stopOnResponse", "autoMarkAsRead"] as const;

export const updateTool = defineTool({
  name: "ghl_workflow_builder_update",
  description:
    "Update workflow name and/or settings (version is required by the API and auto-fetched via GET if not supplied). To update action steps use save_steps instead -- it also keeps the advanced canvas in sync. " +
    "IMPORTANT: verified live against a real account -- PUT /workflow/{loc}/{wfId} is a full-document replace, not a partial patch: any of `name`, `timezone`, `allowMultiple`, `removeContactFromLastStep`, `stopOnResponse`, `autoMarkAsRead`, or `workflowData.templates` omitted from the body gets silently cleared, not left alone. This tool always re-fetches and re-includes ALL current persistent fields and steps, applying only the fields you actually pass as overrides, so a partial update never wipes anything you didn't intend to change.",
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

    const explicitVersion = optionalNumber(args, "version");
    const current = await getWorkflowMetadata(env, locationId, workflowId);
    const version = explicitVersion ?? current.version;
    const currentSteps = await getWorkflowSteps(env, current);

    const body: Record<string, unknown> = {
      version,
      ...extractPersistentFields(current),
      workflowData: { templates: currentSteps },
    };

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
