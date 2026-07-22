import { performAutoSave } from "../ghl/autosave";
import { internalRequest } from "../ghl/client";
import { getWorkflowMetadata, getWorkflowTriggers } from "../ghl/workflow";
import { defineTool } from "./definition";
import { optionalBoolean, optionalNumber, optionalString, requireString, resolveLocationId, ToolInputError } from "./helpers";
import { normalizeTemplates } from "./templateUtils";

export const saveStepsTool = defineTool({
  name: "ghl_workflow_builder_save_steps",
  description:
    "Replace a workflow's action steps (the templates array). Auto-fetches the current version if not supplied, performs the regular PUT save, then automatically runs an auto-save sync (carrying forward existing triggers) so the change is visible on the advanced canvas -- matching GHL's documented recommended build sequence. Set skipAutoSave to opt out.",
  inputSchema: {
    type: "object",
    required: ["workflowId", "templates"],
    properties: {
      locationId: { type: "string" },
      workflowId: { type: "string" },
      version: { type: "number", description: "Current version. Auto-fetched via GET if omitted." },
      templates: {
        type: "array",
        description: 'Full replacement templates array. Each item: {id?, order?, name?, type, attributes, next, parentKey}.',
        items: { type: "object" },
      },
      userId: { type: "string", description: "GHL user ID for the auto-save session. Defaults to the workflow's updatedBy." },
      skipAutoSave: { type: "boolean", description: "Skip the advanced-canvas auto-save sync. Default false." },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    const workflowId = requireString(args, "workflowId");
    const { templates, warnings } = normalizeTemplates(args.templates);
    if (templates.length === 0) throw new ToolInputError('"templates" must be a non-empty array');

    const current = await getWorkflowMetadata(env, locationId, workflowId);
    const version = optionalNumber(args, "version") ?? current.version;

    const saveResult = await internalRequest(env, {
      method: "PUT",
      path: `/workflow/${locationId}/${workflowId}`,
      body: { version, workflowData: { templates } },
    });

    let autoSaveResult: unknown = "skipped";
    if (!optionalBoolean(args, "skipAutoSave")) {
      const refreshed = await getWorkflowMetadata(env, locationId, workflowId);
      const existingTriggers = await getWorkflowTriggers(env, refreshed);
      autoSaveResult = await performAutoSave(env, {
        locationId,
        workflowId,
        userId: optionalString(args, "userId") ?? refreshed.updatedBy,
        templates,
        triggers: existingTriggers,
        version: refreshed.version,
        status: refreshed.status,
      });
    }

    return { save: saveResult, autoSave: autoSaveResult, warnings: warnings.length ? warnings : undefined };
  },
});
