import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes } from "mdast";
import { BaseNode } from "../../core/base-node.js";
function text(node: Nodes): string {
  return "value" in node
    ? node.value
    : "children" in node
      ? node.children.map(text).join("")
      : "";
}
export class NoteNode extends BaseNode {
  override readonly type = "note" as const;
  get title(): string {
    const heading = fromMarkdown(this.body).children.find(
      (node) => node.type === "heading" && node.depth === 1,
    );
    return heading ? text(heading) : "";
  }
  set title(value: string) {
    if (/[\r\n]/.test(value)) throw new Error("Note title must be one line.");
    const heading = fromMarkdown(this.body).children.find(
      (node) => node.type === "heading" && node.depth === 1,
    );
    const rendered = "# " + value.replace(/[\\`*_[\]<>#&]/g, "\\$&");
    this.body = heading
      ? this.body.slice(0, heading.position!.start.offset) +
        rendered +
        this.body.slice(heading.position!.end.offset)
      : rendered + "\n\n" + this.body;
  }
}
