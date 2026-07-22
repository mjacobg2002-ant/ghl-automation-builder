import { internalRequest } from "../ghl/client";
import { defineTool } from "./definition";
import { optionalString, requireString, resolveLocationId } from "./helpers";
import { normalizeTemplates } from "./templateUtils";

export const createTool = defineTool({
  name: "ghl_workflow_builder_create",
  description:
    "Create a new GHL workflow, optionally with initial action steps. Use create_folder for directories. Action type strings are validated against the known registry and auto-corrected where a documented mistake exists (returned in `warnings`).",
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      locationId: { type: "string", description: "GHL location ID. Defaults to the server's DEFAULT_LOCATION_ID if configured." },
      name: { type: "string", description: "Workflow display name." },
      parentId: { type: "string", description: "Folder ID to create the workflow inside." },
      templates: {
        type: "array",
        description:
          'Initial action steps (workflowData.templates). Each item: {id?, order?, name?, type, attributes, next, parentKey}. "id" is generated if omitted.',
        items: { type: "object" },
      },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    const name = requireString(args, "name");
    const parentId = optionalString(args, "parentId");

    const body: Record<string, unknown> = { name };
    if (parentId) body.parentId = parentId;

    let warnings: string[] = [];
    if (args.templates !== undefined) {
      const normalized = normalizeTemplates(args.templates);
      warnings = normalized.warnings;
      body.workflowData = { templates: normalized.templates };
    }

    const result = await internalRequest<{ id: string }>(env, {
      method: "POST",
      path: `/workflow/${locationId}`,
      body,
    });

    return { ...result, warnings: warnings.length ? warnings : undefined };
  },
});
