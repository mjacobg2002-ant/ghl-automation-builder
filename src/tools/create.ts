import { internalRequest } from "../ghl/client";
import { extractPersistentFields, getWorkflowMetadata } from "../ghl/workflow";
import { defineTool } from "./definition";
import { optionalString, requireString, resolveLocationId } from "./helpers";
import { normalizeTemplates } from "./templateUtils";

export const createTool = defineTool({
  name: "ghl_workflow_builder_create",
  description:
    "Create a new GHL workflow, optionally with initial action steps. Use create_folder for directories. Action type strings are validated against the known registry and auto-corrected where a documented mistake exists (returned in `warnings`). " +
    "IMPORTANT: verified live against a real account -- POST /workflow/{loc} silently ignores `name` and assigns its own default (e.g. \"New Workflow : <timestamp>\") regardless of what's sent. This tool detects that by re-fetching after create and, if the name didn't stick, issues one follow-up rename (which safely preserves the just-created steps -- see the update tool's notes) so callers still get back a workflow with the requested name.",
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
    let templates: unknown[] = [];
    if (args.templates !== undefined) {
      const normalized = normalizeTemplates(args.templates);
      warnings = normalized.warnings;
      templates = normalized.templates;
      body.workflowData = { templates: normalized.templates };
    }

    const result = await internalRequest<{ id: string }>(env, {
      method: "POST",
      path: `/workflow/${locationId}`,
      body,
    });

    const created = await getWorkflowMetadata(env, locationId, result.id);
    let finalName = created.name;
    let nameWasCorrected = false;

    if (created.name !== name) {
      await internalRequest(env, {
        method: "PUT",
        path: `/workflow/${locationId}/${result.id}`,
        body: { version: created.version, ...extractPersistentFields(created), name, workflowData: { templates } },
      });
      finalName = name;
      nameWasCorrected = true;
      warnings.push(
        `GHL ignored the requested name on create (got "${created.name}") -- issued a follow-up rename to "${name}", preserving the initial steps.`
      );
    }

    return { id: result.id, name: finalName, nameWasCorrected, warnings: warnings.length ? warnings : undefined };
  },
});
