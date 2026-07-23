/** Read helpers that stitch together MongoDB metadata + the two Firebase Storage blobs into usable shapes. */
import type { Env } from "../types/env";
import { internalRequest } from "./client";
import { buildTriggersStorageUrl, fetchFirebaseFile } from "./firebaseStorage";
import type { ActionStep, WorkflowMetadata, WorkflowTrigger } from "./types";

export async function getWorkflowMetadata(env: Env, locationId: string, workflowId: string): Promise<WorkflowMetadata> {
  return internalRequest<WorkflowMetadata>(env, { path: `/workflow/${locationId}/${workflowId}` });
}

/** Downloads the templates array from the workflow's signed fileUrl. Falls back to inline workflowData if no fileUrl exists yet (brand-new workflow). */
export async function getWorkflowSteps(env: Env, metadata: WorkflowMetadata): Promise<ActionStep[]> {
  if (metadata.fileUrl) {
    const data = await fetchFirebaseFile<{ templates?: ActionStep[] }>(metadata.fileUrl);
    if (data?.templates) return data.templates;
  }
  return metadata.workflowData?.templates ?? [];
}

/** Downloads triggers from Firebase Storage via triggersFilePath. Per docs/api-reference.md, there is no REST GET for triggers. */
export async function getWorkflowTriggers(env: Env, metadata: WorkflowMetadata): Promise<WorkflowTrigger[]> {
  if (!metadata.triggersFilePath) return [];
  const url = buildTriggersStorageUrl(metadata.triggersFilePath);
  const data = await fetchFirebaseFile<WorkflowTrigger[] | { triggers?: WorkflowTrigger[] }>(url);
  if (Array.isArray(data)) return data;
  if (data && "triggers" in data && Array.isArray(data.triggers)) return data.triggers;
  return [];
}

export interface PersistentWorkflowFields {
  name: string;
  timezone?: string;
  allowMultiple?: boolean;
  removeContactFromLastStep?: boolean;
  stopOnResponse?: boolean;
  autoMarkAsRead?: boolean;
}

/**
 * Verified live against a real account (2026-07-23): both
 * `PUT /workflow/{loc}/{wfId}` and `PUT .../auto-save` do a full-document
 * replace, not a partial patch -- any of these fields omitted from the
 * request body gets silently cleared server-side (confirmed for both `name`
 * and `workflowData.templates`). Every write path must spread these current
 * values into its body first, then let explicit overrides win, or it risks
 * wiping metadata that wasn't even part of the intended change.
 */
export function extractPersistentFields(meta: WorkflowMetadata): PersistentWorkflowFields {
  return {
    name: meta.name,
    timezone: meta.timezone,
    allowMultiple: meta.allowMultiple,
    removeContactFromLastStep: meta.removeContactFromLastStep,
    stopOnResponse: meta.stopOnResponse,
    autoMarkAsRead: meta.autoMarkAsRead,
  };
}
