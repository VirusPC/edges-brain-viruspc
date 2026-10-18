import { dirname, relative } from "node:path";
import {
  InternalNode,
  type InternalChildLists,
  type InternalCreateInput,
} from "../core/internal-node.js";
import { InternalSyntax, type SyntaxReference } from "../agents/syntax.js";
import { identifyNodeType, resolveEntryHref } from "../layout.js";

export interface ReadmeCreateInput extends InternalCreateInput {}

/** README.md composition: project-entries-local / project-entries-descendants. */
export class ReadmeNode extends InternalNode<ReadmeCreateInput, ReadmeCreateInput> {
  override readonly type = "readme";
  #syntax = new InternalSyntax("", undefined, "entries");
  #hrefs = new Map<string, string>();

  protected override duplicateChildError(id: string): string {
    return `${this.path}: Child already listed: ${id}`;
  }
  protected override missingChildError(id: string): string {
    return `${this.path}: Child is not listed: ${id}`;
  }
  protected override duplicateSectionError(id: string): string {
    return `${this.path}: child already listed: ${id}`;
  }

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
    const references = (entries: readonly SyntaxReference[]): InternalChildLists["localChildren"] =>
      entries.flatMap((entry) => {
        const id = resolveEntryHref(this.path, entry.target, true);
        if (!id) return [];
        hrefs.set(id, entry.target);
        return [
          {
            id,
            ...(entry.label === undefined ? {} : { name: entry.label }),
            ...(entry.description === undefined
              ? {}
              : { description: entry.description }),
          },
        ];
      });
    const next = {
      localChildren: references(parsed.localChildren),
      descendantChildren: references(parsed.descendantChildren),
    };
    this.assertChildLists(next);
    this.installChildLists(next);
    this.#syntax = syntax;
    this.#hrefs = hrefs;
  }

  #refs(items: readonly { id: string; name?: string; description?: string }[]): SyntaxReference[] {
    return items.map((ref) => ({
      target:
        this.#hrefs.get(ref.id) ??
        relative(dirname(this.path), ref.id)
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/"),
      ...(ref.name === undefined ? {} : { label: ref.name }),
      ...(ref.description === undefined
        ? {}
        : { description: ref.description }),
    }));
  }

  protected override serializeBody(): string {
    const lists = this.childLists();
    return this.#syntax.serialize({
      constraints: [],
      localChildren: this.#refs(lists.localChildren),
      descendantChildren: this.#refs(lists.descendantChildren),
    });
  }

  protected override commitChildLists(next: InternalChildLists): void {
    this.assertChildLists(next);
    this.#syntax.serialize({
      constraints: [],
      localChildren: this.#refs(next.localChildren),
      descendantChildren: this.#refs(next.descendantChildren),
    });
    super.commitChildLists(next);
  }

  override validate(): void {
    super.validate();
    this.serializeBody();
  }
}
