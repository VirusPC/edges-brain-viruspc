import { BaseNode } from "./base-node.js";
import type { NodeCreateInput, NodeUpdateInput } from "./types.js";

/** @deprecated Plain text node; business nodes extend BaseNode directly. */
export class LeafNode<
  CreateInput extends NodeCreateInput = NodeCreateInput,
  UpdateInput extends NodeUpdateInput = NodeUpdateInput,
> extends BaseNode<CreateInput, UpdateInput> {
  override readonly type: string = "text";
}
