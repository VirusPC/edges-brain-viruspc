import type { Metadata } from "../../../utils/markdown/types.js";

export type AgentsText = { kind: 'text'; value: string };

export type AgentsLink = { kind: 'link'; label: string; target: string };

export type AgentsItem = { content: (AgentsText | AgentsLink)[] };

export type SectionKey = 'constraints' | 'memory' | 'children' | 'compose';

/** AGENTS document representation, not a domain node; targets keep authored spelling. */
export interface AgentsDocument {
  metadata?: Metadata;
  constraints: AgentsItem[];
  memory: AgentsItem[];
  children: AgentsItem[];
  compose: AgentsItem[];
  references: AgentsLink[];
}

export type { Metadata, MetadataValue } from "../../../utils/markdown/types.js";

export function createAgentsDocument(): AgentsDocument {
  return { constraints: [], memory: [], children: [], compose: [], references: [] };
}

export function agentsLinks(model: AgentsDocument) {
  const links = (items: AgentsItem[]): AgentsLink[] => items.flatMap(item => item.content.filter(run => run.kind === 'link'));
  return {
    children: links(model.children),
    references: [...links(model.constraints), ...links(model.memory), ...model.references],
  };
}
