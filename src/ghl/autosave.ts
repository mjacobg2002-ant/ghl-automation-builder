/**
 * Builds and sends the auto-save payload, per docs/save-modes.md and
 * docs/api-reference.md "Auto-Save (Advanced Canvas Sync)". This is the
 * mechanism GHL's advanced canvas builder uses internally to sync steps AND
 * triggers to Firebase/Firestore -- without it, steps saved via regular PUT
 * are invisible on the advanced canvas, and triggers created via the trigger
 * CRUD API are invisible to get_triggers (CLAUDE.md gotchas). The save_steps,
 * create_trigger, update_trigger, delete_trigger, and clone tools all call
 * this after their primary mutation so the advanced canvas never drifts out
 * of sync with what the API just wrote.
 */
import type { Env } from "../types/env";
import { internalRequest } from "./client";
import type { ActionStep, WorkflowTrigger } from "./types";
import { generateUuid } from "../util/uuid";

export interface AutoSaveOptions {
  locationId: string;
  workflowId: string;
  // Required, not optional: verified live that omitting `name` from this PUT
  // silently clears it (see ghl/workflow.ts extractPersistentFields). Always
  // pass the workflow's current name (or its just-corrected one) here.
  name: string;
  userId?: string;
  templates: ActionStep[];
  triggers: WorkflowTrigger[];
  oldTriggers?: WorkflowTrigger[];
  version: number;
  status?: "draft" | "published";
}

/** Adds default left-to-right canvas positions to steps that don't already have one. */
function withCanvasPosition(steps: ActionStep[]): ActionStep[] {
  return steps.map((step, idx) => ({
    ...step,
    cat: step.cat ?? "",
    advanceCanvasMeta: step.advanceCanvasMeta ?? { position: { x: 400 + idx * 300, y: 0 } },
  }));
}

/** Adds the extra fields auto-save requires on triggers beyond the trigger CRUD API's shape (docs/save-modes.md "Trigger Format for Auto-Save"). */
function formatTriggerForAutoSave(trigger: WorkflowTrigger, locationId: string, workflowId: string, idx: number): WorkflowTrigger {
  const now = new Date().toISOString();
  return {
    ...trigger,
    workflow_id: trigger.workflow_id ?? workflowId,
    location_id: trigger.location_id ?? locationId,
    belongs_to: "workflow",
    deleted: trigger.deleted ?? false,
    date_added: trigger.date_added ?? now,
    date_updated: now,
    advanceCanvasMeta: trigger.advanceCanvasMeta ?? { position: { x: 57.5 + idx * 40, y: -73 } },
  };
}

export async function performAutoSave(env: Env, opts: AutoSaveOptions): Promise<unknown> {
  const newTriggers = opts.triggers.map((t, idx) => formatTriggerForAutoSave(t, opts.locationId, opts.workflowId, idx));
  const oldTriggers = (opts.oldTriggers ?? opts.triggers).map((t, idx) =>
    formatTriggerForAutoSave(t, opts.locationId, opts.workflowId, idx)
  );

  const body = {
    version: opts.version,
    name: opts.name,
    status: opts.status ?? "draft",
    meta: { advanceCanvasMeta: { enabled: true, enabledAt: new Date().toISOString() } },
    workflowData: { templates: withCanvasPosition(opts.templates) },
    triggersChanged: true,
    oldTriggers,
    newTriggers,
    isAutoSave: true,
    autoSaveSession: {
      workflowId: opts.workflowId,
      id: generateUuid(),
      userId: opts.userId ?? "",
      version: opts.version,
      inProgress: true,
    },
    scheduledPauseDates: [],
    modifiedSteps: [],
    deletedSteps: [],
    createdSteps: [],
    senderAddress: {},
    eventStartDate: "",
  };

  return internalRequest(env, {
    method: "PUT",
    path: `/workflow/${opts.locationId}/${opts.workflowId}/auto-save`,
    body,
  });
}
