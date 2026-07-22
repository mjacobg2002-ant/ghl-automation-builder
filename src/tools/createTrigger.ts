import { performAutoSave } from "../ghl/autosave";
import { internalRequest } from "../ghl/client";
import { getWorkflowMetadata, getWorkflowSteps, getWorkflowTriggers } from "../ghl/workflow";
import type { WorkflowTrigger } from "../ghl/types";
import { lookupTriggerType } from "../registry/triggerTypes";
import { defineTool } from "./definition";
import { optionalBoolean, optionalString, requireString, resolveLocationId } from "./helpers";

export const createTriggerTool = defineTool({
  name: "ghl_workflow_builder_create_trigger",
  description:
    "Create a trigger and attach it to a workflow. Automatically sets targetActionId to the workflow's first (order:0) step if not provided -- without it the trigger floats disconnected on the advanced canvas per documented GHL behavior -- and runs an auto-save sync afterward so the trigger becomes readable via get_triggers. Set skipAutoSave to opt out.",
  inputSchema: {
    type: "object",
    required: ["workflowId", "type", "name"],
    properties: {
      locationId: { type: "string" },
      workflowId: { type: "string" },
      type: {
        type: "string",
        description:
          "Trigger type API string (e.g. contact_tag_added, appointment, form_submitted). Many UI names differ from their API value -- see the trigger type registry notes returned in this tool's response.",
      },
      name: { type: "string" },
      active: { type: "boolean", description: "Default true." },
      conditions: {
        type: "array",
        description: 'Filter conditions, AND logic. Each item: {operator, field, value, title?, type?}.',
        items: { type: "object" },
      },
      targetActionId: { type: "string", description: "Step ID to connect on the advanced canvas. Defaults to the workflow's first step." },
      skipAutoSave: { type: "boolean" },
    },
  },
  async run(args, env) {
    const locationId = resolveLocationId(args, env);
    const workflowId = requireString(args, "workflowId");
    const type = requireString(args, "type");
    const name = requireString(args, "name");
    const active = optionalBoolean(args, "active") ?? true;
    const conditions = Array.isArray(args.conditions) ? args.conditions : [];
    const triggerTypeInfo = lookupTriggerType(type);

    const createResult = await internalRequest<{ id: string }>(env, {
      method: "POST",
      path: `/workflow/${locationId}/trigger`,
      body: {
        type,
        name,
        active,
        workflowId,
        conditions,
        actions: [{ workflow_id: workflowId, type: "add_to_workflow" }],
      },
    });

    const triggerId = createResult.id;
    const metadata = await getWorkflowMetadata(env, locationId, workflowId);
    const steps = await getWorkflowSteps(env, metadata);
    const firstStep = steps.find((s) => s.order === 0) ?? steps[0];
    const targetActionId = optionalString(args, "targetActionId") ?? firstStep?.id;

    let targetActionUpdate: unknown = "skipped (workflow has no steps yet to connect to)";
    if (targetActionId) {
      targetActionUpdate = await internalRequest(env, {
        method: "PUT",
        path: `/workflow/${locationId}/trigger/${triggerId}`,
        body: { targetActionId },
      });
    }

    let autoSaveResult: unknown = "skipped";
    if (!optionalBoolean(args, "skipAutoSave")) {
      const existingTriggers = await getWorkflowTriggers(env, metadata);
      const newTrigger: WorkflowTrigger = {
        id: triggerId,
        type,
        name,
        active,
        workflow_id: workflowId,
        location_id: locationId,
        conditions,
        targetActionId,
      };
      autoSaveResult = await performAutoSave(env, {
        locationId,
        workflowId,
        userId: metadata.updatedBy,
        templates: steps,
        triggers: [...existingTriggers.filter((t) => t.id !== triggerId), newTrigger],
        oldTriggers: existingTriggers,
        version: metadata.version,
        status: metadata.status,
      });
    }

    return { triggerId, create: createResult, targetActionUpdate, autoSave: autoSaveResult, triggerTypeInfo };
  },
});
