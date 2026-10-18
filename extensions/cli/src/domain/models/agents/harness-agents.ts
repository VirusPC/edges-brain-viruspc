import { basename } from "node:path";
import { ENTRY_NAMES } from "../../config/layout.js";
import { decodeBody } from "../node/document.js";

const HARNESS_START =
  /<!--\s+(project-harness-constraints|project-harness-local|project-harness-descendants|project-harness-compose|project-memory-important|project-memory-local|project-memory-children):start\s+-->/;

/** True when path is AGENTS.md and body carries a project-harness (or legacy memory) layer. */
export function isProjectHarnessAgentsFile(absPath: string, source: string): boolean {
  if (basename(absPath) !== ENTRY_NAMES.internal) return false;
  if (HARNESS_START.test(source)) return true;
  const decoded = decodeBody(source);
  return (
    decoded.sections.constraints.present ||
    decoded.sections.memory.present ||
    decoded.sections.children.present ||
    decoded.sections.compose.present
  );
}
