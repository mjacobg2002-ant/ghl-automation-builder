import type { ToolDefinition } from "./definition";
import { listTool } from "./list";
import { createTool } from "./create";
import { getTool } from "./get";
import { getStepsTool } from "./getSteps";
import { getTriggersTool } from "./getTriggers";
import { updateTool } from "./update";
import { saveStepsTool } from "./saveSteps";
import { publishTool, draftTool } from "./changeStatus";
import { deleteTool } from "./delete";
import { createTriggerTool } from "./createTrigger";
import { updateTriggerTool } from "./updateTrigger";
import { deleteTriggerTool } from "./deleteTrigger";
import { createFolderTool } from "./createFolder";
import { cloneTool } from "./clone";
import { errorCountTool } from "./errorCount";

/** All 16 documented ghl_workflow_builder_* MCP tools, in the order listed in README.md / CLAUDE.md. */
export const TOOLS: ToolDefinition[] = [
  listTool,
  createTool,
  getTool,
  getStepsTool,
  getTriggersTool,
  updateTool,
  saveStepsTool,
  publishTool,
  draftTool,
  deleteTool,
  createTriggerTool,
  updateTriggerTool,
  deleteTriggerTool,
  createFolderTool,
  cloneTool,
  errorCountTool,
];

export const TOOLS_BY_NAME: ReadonlyMap<string, ToolDefinition> = new Map(TOOLS.map((t) => [t.name, t]));
