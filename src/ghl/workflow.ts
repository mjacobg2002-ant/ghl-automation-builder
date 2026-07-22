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
