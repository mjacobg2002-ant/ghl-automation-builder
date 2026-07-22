/**
 * Data shapes for the GHL internal workflow API, per docs/data-schemas.md and
 * schemas/action-schemas.md. These are intentionally loose (index signatures)
 * because the internal API is undocumented and reverse-engineered -- fields
 * not listed here may appear on real objects, and we must round-trip them
 * unmodified rather than dropping them.
 */

export interface WorkflowMetadata {
  _id: string;
  locationId: string;
  companyId?: string;
  name: string;
  version: number;
  dataVersion?: number;
  status: "draft" | "published";
  type: "workflow" | "directory";
  parentId: string | null;
  allowMultiple?: boolean;
  timezone?: string;
  removeContactFromLastStep?: boolean;
  stopOnResponse?: boolean;
  autoMarkAsRead?: boolean;
  filePath?: string;
  fileUrl?: string;
  triggersFilePath?: string;
  permission?: number;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  creationSource?: string;
  originType?: string;
  workflowData?: { templates?: ActionStep[] };
  meta?: { advanceCanvasMeta?: { enabled?: boolean; enabledAt?: string } };
  [key: string]: unknown;
}

export interface ActionStep {
  id: string;
  order: number;
  name: string;
  type: string;
  attributes: Record<string, unknown>;
  next: string | string[] | null;
  parentKey: string | null;
  cat?: string;
  advanceCanvasMeta?: { position: { x: number; y: number } };
  [key: string]: unknown;
}

export interface TriggerCondition {
  operator: string;
  field: string;
  value?: unknown;
  title?: string;
  type?: string;
  [key: string]: unknown;
}

export interface WorkflowTrigger {
  id?: string;
  type: string;
  name: string;
  active: boolean;
  masterType?: string;
  workflow_id?: string;
  workflowId?: string;
  location_id?: string;
  belongs_to?: string;
  deleted?: boolean;
  date_added?: string;
  date_updated?: string;
  targetActionId?: string;
  conditions?: TriggerCondition[];
  actions?: Array<{ workflow_id: string; type: string }>;
  schedule_config?: Record<string, unknown>;
  advanceCanvasMeta?: { position: { x: number; y: number } };
  [key: string]: unknown;
}

export interface ListWorkflowsResponse {
  rows: WorkflowMetadata[];
  [key: string]: unknown;
}
