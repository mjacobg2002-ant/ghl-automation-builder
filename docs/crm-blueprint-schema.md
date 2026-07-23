# CRM Blueprint Schema

## Purpose

Defines the structured representation used by the AI planner to generate a complete GHL CRM deployment.

The blueprint is the source of truth between:

User Request
→ AI Planning Layer
→ Validation Layer
→ Deployment Engine
→ GHL MCP Tools


# Core Blueprint Object

```ts
interface CRMBlueprint {
  id: string;
  version: string;

  business: {
    name?: string;
    industry: string;
    salesProcess: string;
  };

  locationId: string;

  pipelines: PipelineBlueprint[];

  customFields: CustomFieldBlueprint[];

  tags: TagBlueprint[];

  workflows: WorkflowBlueprint[];

  routingRules: RoutingRuleBlueprint[];
}
interface PipelineBlueprint {
  name: string;

  stages: {
    name: string;
    order: number;
  }[];
}
interface CustomFieldBlueprint {
  name: string;

  type:
    | "text"
    | "number"
    | "date"
    | "dropdown"
    | "checkbox";

  options?: string[];
}
interface WorkflowBlueprint {
  name: string;

  trigger: {
    type: string;
    verified: boolean;
  };

  actions: {
    type: string;
    verified: boolean;
    config: Record<string, unknown>;
  }[];
}
interface DeploymentPlan {
  resources: {
    type: string;
    action: "create" | "update" | "skip";
    dependency?: string;
  }[];

  estimatedApiCalls: number;
}
