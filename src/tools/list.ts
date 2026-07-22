import { internalRequest } from "../ghl/client";
import type { ListWorkflowsResponse } from "../ghl/types";
import { defineTool } from "./definition";
import { optionalBoolean, optionalNumber, optionalString, resolveLocationId } from "./helpers";

export const listTool = defineTool({
  name: "ghl_workflow_builder_list",
  description:
    "List workflows and folders in a GHL location. Supports pagination, sorting, and filtering by parent folder or row type (workflow vs directory).",
  inputSchema: {
    type: "object",
    properties: {
      locationId: { type: "string", description: "GHL location ID. Defaults to the server's DEFAULT_LOCATION_ID if configured." },
      limit: { type: "number", description: "Max results per page. Default 50." },
      offset: { type: "number", description: "Pagination offset. Default 0." },
      sortBy: { type: "string", description: "Sort field. Default updatedAt." },
      sortOrder: { type: "string", enum: ["asc", "desc"], description: "Default desc." },
      parentId: { type: "string", description: "Filter by folder ID. Omit for root-level items." },
      type: { type: "string", enum: ["workflow", "directory"], description: "Filter by row type." },
      includeCustomObjects: { type: "boolean" },
      includeObjectiveBuilder: { type: "boolean" },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    return internalRequest<ListWorkflowsResponse>(env, {
      path: `/workflow/${locationId}/list`,
      query: {
        limit: optionalNumber(args, "limit") ?? 50,
        offset: optionalNumber(args, "offset") ?? 0,
        sortBy: optionalString(args, "sortBy") ?? "updatedAt",
        sortOrder: optionalString(args, "sortOrder") ?? "desc",
        parentId: optionalString(args, "parentId"),
        type: optionalString(args, "type"),
        includeCustomObjects: optionalBoolean(args, "includeCustomObjects"),
        includeObjectiveBuilder: optionalBoolean(args, "includeObjectiveBuilder"),
      },
    });
  },
});
