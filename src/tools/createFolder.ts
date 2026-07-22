import { internalRequest } from "../ghl/client";
import { defineTool } from "./definition";
import { optionalString, requireString, resolveLocationId } from "./helpers";

export const createFolderTool = defineTool({
  name: "ghl_workflow_builder_create_folder",
  description: "Create a folder (directory) to organize workflows.",
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      locationId: { type: "string" },
      name: { type: "string", description: "Folder display name." },
      parentId: { type: "string", description: "Parent folder ID, for nested folders." },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    const name = requireString(args, "name");
    const parentId = optionalString(args, "parentId");

    const body: Record<string, unknown> = { name, type: "directory" };
    if (parentId) body.parentId = parentId;

    return internalRequest<{ id: string }>(env, { method: "POST", path: `/workflow/${locationId}`, body });
  },
});
