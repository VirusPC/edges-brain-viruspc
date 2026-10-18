/** Migration-only reader/editor for pre-directory Markdown indexes. Never used by production CLI. */
import { resolveHref } from "../extensions/cli/src/domain/models/node/layout.js";
import { InternalSyntax, type SyntaxContent, type SyntaxReference } from "../extensions/cli/src/domain/models/node/document.js";
import {
  parseDocument,
  serializeDocument,
} from "../extensions/cli/src/utils/markdown/document.js";
type LegacyReference = SyntaxReference & {
  id: string;
  kind: "local" | "descendant";
};
export class LegacyIndex {
  private syntax!: InternalSyntax;
  private content!: SyntaxContent;
  private metadata: ReturnType<typeof parseDocument>["metadata"];
  constructor(readonly path: string) {}
  parse(source: string): this {
    const doc = parseDocument(source);
    this.metadata = doc.metadata;
    this.syntax = new InternalSyntax(doc.body);
    this.content = this.syntax.content();
    return this;
  }
  get children(): LegacyReference[] {
    return (["local", "descendant"] as const).flatMap((kind) =>
      this.content[
        kind === "local" ? "localChildren" : "descendantChildren"
      ].map((child) => ({
        ...child,
        kind,
        id: resolveHref(this.path, child.target) ?? child.target,
      })),
    );
  }
  addChild(child: SyntaxReference & { kind: "local" | "descendant" }): void {
    const key = child.kind === "local" ? "localChildren" : "descendantChildren";
    this.content = {
      ...this.content,
      [key]: [
        ...this.content[key],
        {
          target: child.target,
          label: child.label,
          description: child.description,
        },
      ],
    };
  }
  removeChild(child: LegacyReference): void {
    for (const key of ["localChildren", "descendantChildren"] as const)
      this.content = {
        ...this.content,
        [key]: this.content[key].filter((ref) => ref.target !== child.target),
      };
  }
  updateChild(child: LegacyReference): void {
    this.removeChild(child);
    this.addChild(child);
  }
  serialize(): string {
    return serializeDocument({
      metadata: this.metadata,
      body: this.syntax.serialize(this.content),
    });
  }
}
