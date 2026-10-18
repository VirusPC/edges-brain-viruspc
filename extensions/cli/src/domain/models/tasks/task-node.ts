import { basename, extname } from "node:path";
import { BaseNode } from "../../core/base-node.js";
import { domainFields, scalar, setDomainField } from "../../core/fields.js";
import { TASK_PRIORITIES, TASK_STATUSES } from "./types.js";
import type { Metadata, NodeContext } from "../../core/types.js";
import type { TaskPriority, TaskStatus, TaskCreateInput, TaskUpdateInput } from "./types.js";

export class TaskNode extends BaseNode<TaskCreateInput, TaskUpdateInput> {
  override readonly type = "task" as const;

  get title(): string {
    return (
      scalar(domainFields(this.metadata)["edges-title"]) ||
      scalar(this.metadata?.name) ||
      basename(this.path, extname(this.path))
    );
  }
  set title(value: string) {
    if (typeof value !== "string" || !value.trim())
      throw new Error(`${this.path}: title must be nonempty.`);
    setDomainField(this, "edges-title", value);
  }
  get status(): TaskStatus {
    return (domainFields(this.metadata)["edges-tasks-status"] ||
      "backlog") as TaskStatus;
  }
  set status(value: TaskStatus) {
    if (!TASK_STATUSES.includes(value))
      throw new Error(`${this.path}: Invalid task status: ${String(value)}`);
    setDomainField(this, "edges-tasks-status", value);
  }
  get priority(): TaskPriority {
    return (domainFields(this.metadata)["edges-task-priority"] ||
      "none") as TaskPriority;
  }
  set priority(value: TaskPriority) {
    if (!TASK_PRIORITIES.includes(value))
      throw new Error(`${this.path}: Invalid task priority: ${String(value)}`);
    setDomainField(this, "edges-task-priority", value);
  }
  get assignee(): string | undefined {
    return (
      scalar(domainFields(this.metadata)["edges-task-assignee"]) || undefined
    );
  }
  set assignee(value: string | undefined) {
    setDomainField(this, "edges-task-assignee", value);
  }

  protected override validateMetadata(metadata: Metadata | undefined): void {
    super.validateMetadata(metadata);
    const fields = domainFields(metadata);
    for (const key of ["edges-title", "edges-task-assignee"])
      if (fields[key] !== undefined && typeof fields[key] !== "string")
        throw new Error(`${this.path}: ${key} must be a string.`);
    for (const [key, allowed] of [
      ["edges-tasks-status", TASK_STATUSES],
      ["edges-task-priority", TASK_PRIORITIES],
    ] as const) {
      const value = fields[key];
      if (
        value !== undefined &&
        value !== "" &&
        !(allowed as readonly unknown[]).includes(value)
      )
        throw new Error(`${this.path}: Invalid ${key}: ${String(value)}`);
    }
  }
  override create(input: TaskCreateInput, context: NodeContext): this {
    this.validateMetadata(input.metadata);
    const fields = domainFields(input.metadata);
    return super.create(
      {
        status: (fields["edges-tasks-status"] || "backlog") as TaskStatus,
        priority: (fields["edges-task-priority"] || "none") as TaskPriority,
        ...input,
      },
      context,
    );
  }
  protected override applyInput(input: TaskCreateInput): void {
    super.applyInput(input);
    if ("title" in input) this.title = input.title!;
    if ("status" in input) this.status = input.status!;
    if ("priority" in input) this.priority = input.priority!;
    if ("assignee" in input) this.assignee = input.assignee;
  }
}
