import { performAutoSave } from "../ghl/autosave";
import { internalRequest, GhlApiError } from "../ghl/client";
import { extractPersistentFields, getWorkflowMetadata, getWorkflowSteps, getWorkflowTriggers } from "../ghl/workflow";
import type { ActionStep, WorkflowTrigger } from "../ghl/types";
import { generateUuid } from "../util/uuid";
import { defineTool } from "./definition";
import { optionalBoolean, optionalString, requireString, resolveLocationId } from "./helpers";

interface CreatedTriggerResult {
  name: string;
  type: string;
  id?: string;
  error?: string;
}

export const cloneTool = defineTool({
  name: "ghl_workflow_builder_clone",
  description:
    "Clone a workflow: reads its metadata, action steps, and triggers (all via Firebase Storage), remaps step IDs to fresh UUIDs, and recreates it -- optionally in a different location and/or folder. Triggers are only recreated when cloning within the same location, since they reference location-specific resources (calendars, forms, pipelines).",
  inputSchema: {
    type: "object",
    required: ["workflowId"],
    properties: {
      locationId: { type: "string", description: "Source location ID." },
      workflowId: { type: "string", description: "Source workflow ID to clone." },
      targetLocationId: { type: "string", description: "Destination location ID. Defaults to the source location." },
      targetFolderId: { type: "string", description: "Folder ID in the destination location to place the clone in." },
      namePrefix: { type: "string", description: 'Prefix for the cloned workflow name. Default "[Clone] ".' },
      cloneTriggers: { type: "boolean", description: "Whether to recreate triggers (only possible within the same location). Default true." },
    },
  },
  async run(args, env) {
    const sourceLocationId = resolveLocationId(args, env);
    const workflowId = requireString(args, "workflowId");
    const targetLocationId = optionalString(args, "targetLocationId") ?? sourceLocationId;
    const targetFolderId = optionalString(args, "targetFolderId");
    const namePrefix = optionalString(args, "namePrefix") ?? "[Clone] ";
    const cloneTriggers = optionalBoolean(args, "cloneTriggers") ?? true;
    const sameLocation = sourceLocationId === targetLocationId;

    const sourceMetadata = await getWorkflowMetadata(env, sourceLocationId, workflowId);
    const sourceTemplates = await getWorkflowSteps(env, sourceMetadata);
    const sourceTriggers = await getWorkflowTriggers(env, sourceMetadata);

    const idMap = new Map<string, string>();
    for (const step of sourceTemplates) idMap.set(step.id, generateUuid());
    function remapId(id: string): string;
    function remapId(id: string | null): string | null;
    function remapId(id: string | null): string | null {
      return id && idMap.has(id) ? (idMap.get(id) as string) : id;
    }

    const remappedTemplates: ActionStep[] = sourceTemplates.map((step) => ({
      ...step,
      id: idMap.get(step.id) ?? step.id,
      next: Array.isArray(step.next) ? step.next.map((n) => remapId(n)) : remapId(step.next),
      parentKey: remapId(step.parentKey),
    }));

    const name = `${namePrefix}${sourceMetadata.name}`;
    const createBody: Record<string, unknown> = { name, workflowData: { templates: remappedTemplates } };
    if (targetFolderId) createBody.parentId = targetFolderId;

    const created = await internalRequest<{ id: string }>(env, {
      method: "POST",
      path: `/workflow/${targetLocationId}`,
      body: createBody,
    });
    const newWorkflowId = created.id;

    // Verified live: POST /workflow/{loc} silently ignores `name` (see the
    // create tool's notes) -- check and fix it here too, since clone creates
    // via a raw request rather than going through createTool.
    let createdMetadata = await getWorkflowMetadata(env, targetLocationId, newWorkflowId);
    let nameWasCorrected = false;
    if (createdMetadata.name !== name) {
      await internalRequest(env, {
        method: "PUT",
        path: `/workflow/${targetLocationId}/${newWorkflowId}`,
        body: { version: createdMetadata.version, ...extractPersistentFields(createdMetadata), name, workflowData: { templates: remappedTemplates } },
      });
      nameWasCorrected = true;
      createdMetadata = await getWorkflowMetadata(env, targetLocationId, newWorkflowId);
    }

    const createdTriggers: CreatedTriggerResult[] = [];
    if (cloneTriggers && sameLocation) {
      for (const trigger of sourceTriggers) {
        try {
          const result = await internalRequest<{ id: string }>(env, {
            method: "POST",
            path: `/workflow/${targetLocationId}/trigger`,
            body: {
              type: trigger.type,
              name: trigger.name,
              active: trigger.active,
              workflowId: newWorkflowId,
              conditions: trigger.conditions ?? [],
              actions: [{ workflow_id: newWorkflowId, type: "add_to_workflow" }],
            },
          });
          createdTriggers.push({ name: trigger.name, type: trigger.type, id: result.id });
        } catch (err) {
          createdTriggers.push({
            name: trigger.name,
            type: trigger.type,
            error: err instanceof GhlApiError ? err.message : err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    let autoSaveResult: unknown = "skipped";
    try {
      const newTriggersForAutoSave: WorkflowTrigger[] = createdTriggers
        .filter((t): t is CreatedTriggerResult & { id: string } => Boolean(t.id))
        .map((t) => ({
          id: t.id,
          type: t.type,
          name: t.name,
          active: true,
          workflow_id: newWorkflowId,
          location_id: targetLocationId,
          conditions: [],
        }));
      autoSaveResult = await performAutoSave(env, {
        locationId: targetLocationId,
        workflowId: newWorkflowId,
        name: createdMetadata.name,
        userId: sourceMetadata.updatedBy,
        templates: remappedTemplates,
        triggers: newTriggersForAutoSave,
        version: createdMetadata.version,
        status: "draft",
      });
    } catch (err) {
      autoSaveResult = `auto-save failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    return {
      source: {
        locationId: sourceLocationId,
        workflowId,
        name: sourceMetadata.name,
        stepCount: sourceTemplates.length,
        triggerCount: sourceTriggers.length,
      },
      clone: { locationId: targetLocationId, workflowId: newWorkflowId, name: createdMetadata.name, nameWasCorrected },
      triggersSkippedReason:
        !sameLocation && sourceTriggers.length > 0
          ? "Cross-location trigger cloning requires manual remapping of resource IDs (calendars, forms, pipelines); triggers were not recreated."
          : cloneTriggers
            ? undefined
            : "cloneTriggers was set to false.",
      createdTriggers: createdTriggers.length ? createdTriggers : undefined,
      autoSave: autoSaveResult,
    };
  },
});
