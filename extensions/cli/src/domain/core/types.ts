export type Metadata = Record<string, unknown>;

export type ChildGroup = "local" | "descendant";

export interface NodeReference {
  id: string;
  name?: string;
  description?: string;
}

export interface NodeCreateInput {
  name?: string;
  description?: string;
  metadata?: Metadata;
  body?: string;
}

export interface NodeUpdateInput extends NodeCreateInput {}

export interface NodeContext {
  operation: "create" | "update" | "destroy";
  parent?: NodeReference;
}
