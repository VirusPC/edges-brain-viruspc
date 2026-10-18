import { BaseNode } from "../../core/base-node.js";
import { domainFields, scalar, setDomainField } from "../../core/fields.js";
import type { Metadata, NodeCreateInput } from "../../core/types.js";

export interface MemoryCreateInput extends NodeCreateInput {
  memoryType?: string;
}

export interface MemoryUpdateInput extends MemoryCreateInput {}

export class MemoryNode extends BaseNode<MemoryCreateInput, MemoryUpdateInput> {
  override readonly type = "memory" as const;

  get memoryType(): string | undefined {
    return (
      scalar(
        domainFields(this.metadata)["edges-type"] ?? this.metadata?.type,
      ) || undefined
    );
  }
  set memoryType(value: string | undefined) {
    setDomainField(this, "edges-type", value);
    this.removeMetadata("type");
  }

  protected override validateMetadata(metadata: Metadata | undefined): void {
    super.validateMetadata(metadata);
    const fields = domainFields(metadata);
    const value = fields["edges-type"] ?? metadata?.type;
    if (value !== undefined && (typeof value !== "string" || !value.trim()))
      throw new Error(`${this.path}: memoryType must be a nonempty string.`);
  }
  protected override applyInput(input: MemoryCreateInput): void {
    super.applyInput(input);
    if ("memoryType" in input) this.memoryType = input.memoryType;
  }
}
