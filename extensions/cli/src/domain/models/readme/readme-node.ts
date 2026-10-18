import { dirname, relative } from "node:path";
import { InternalNode, type InternalCreateInput } from "../../core/internal-node.js";
import { InternalSyntax, type SyntaxReference } from "../node/document.js";
import { identifyNodeType, resolveEntryHref } from "../node/layout.js";
import type { NodeReference } from "../../core/types.js";

export interface ReadmeCreateInput extends InternalCreateInput {}

/** README.md composition: project-entries-local / project-entries-descendants. */
export class ReadmeNode extends InternalNode<ReadmeCreateInput, ReadmeCreateInput> {
  override readonly type = "readme";
  #syntax = new InternalSyntax("", undefined, "entries");
  #hrefs = new Map<string, string>();

  protected override parseBody(markdown: string): void {
    const syntax = new InternalSyntax(
      markdown,
      (href) => {
        const id = resolveEntryHref(this.path, href, true);
        return !!id && identifyNodeType(id) !== undefined;
      },
      "entries",
    );
    const parsed = syntax.content();
    const hrefs = new Map<string, string>();
    const references = (entries: readonly SyntaxReference[]): NodeReference[] =>
      entries.flatMap((entry) => {
        const id = resolveEntryHref(this.path, entry.target, true);
        if (!id) return [];
        hrefs.set(id, entry.target);
        return [{
          id,
          ...(entry.label === undefined ? {} : { name: entry.label }),
          ...(entry.description === undefined ? {} : { description: entry.description }),
        }];
      });
    const previousSyntax = this.#syntax;
    const previousHrefs = this.#hrefs;
    this.#syntax = syntax;
    this.#hrefs = hrefs;
    try {
      this.replace(references(parsed.localChildren), references(parsed.descendantChildren));
    } catch (error) {
      this.#syntax = previousSyntax;
      this.#hrefs = previousHrefs;
      throw error;
    }
  }

  #links(items: readonly NodeReference[]): SyntaxReference[] {
    return items.map((ref) => ({
      target:
        this.#hrefs.get(ref.id) ??
        relative(dirname(this.path), ref.id).split("/").map((part) => encodeURIComponent(part)).join("/"),
      ...(ref.name === undefined ? {} : { label: ref.name }),
      ...(ref.description === undefined ? {} : { description: ref.description }),
    }));
  }

  protected override serializeBody(): string {
    return this.#syntax.serialize({
      constraints: [],
      localChildren: this.#links(this.locals),
      descendantChildren: this.#links(this.descendants),
    });
  }
}
