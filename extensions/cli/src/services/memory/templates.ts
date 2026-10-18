import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { readText, typeDirName } from "./paths.js";
export const ENTRY_LINE_TEMPLATE = "entry_line.md";
export function templateRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../assets/memory/templates"),
    join(here, "../../../../skills/project-memory-init/references/templates"),
  ];
  const root = candidates.find((p) =>
    existsSync(join(p, `${parse(ENTRY_NAMES.internal).name}.tmpl.md`)),
  );
  if (!root)
    throw new Error(`Memory templates not found: ${candidates.join(", ")}`);
  return root;
}
export const templatePath = (name: string) =>
  join(templateRoot(), `${parse(name).name.toLowerCase() === "index" ? "index" : parse(name).name}.tmpl.md`);
export const readTemplate = (name: string) => readText(templatePath(name));
export function fillPlaceholders(
  text: string,
  values: Record<string, string>,
): string {
  return text
    .split("\n")
    .flatMap((line) => {
      const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
      if (keys.length && !keys.some((key) => values[key])) return [];
      return [
        line
          .replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "")
          .replace(/ — $/, ""),
      ];
    })
    .join("\n");
}
export const renderLine = (name: string, values: Record<string, string>) =>
  fillPlaceholders(readTemplate(name).trim(), values);
export function readIndexTemplate(
  file: string,
  name: string,
  description: string,
  flags: Record<string, string> = {},
): string {
  if (existsSync(templatePath(file))) return readTemplate(file);
  const plural = typeDirName(name),
    format = flags.format ?? "ordinary";
  return fillPlaceholders(
    readTemplate("TYPE.md").replace(
      "description: {description}",
      "description: {yaml_description}",
    ),
    {
      yaml_description: JSON.stringify(description || name),
      NAME: name.toUpperCase(),
      type: name,
      module: flags.module ?? "memory",
      description: description || name,
      plural,
      body_hint:
        format === "skills"
          ? `\`${plural}/<name>/SKILL.md\``
          : `\`${plural}/${name}_<slug>.md\``,
      gitignore: flags.gitignore ?? "false",
      writable: flags.writable ?? "true",
      format,
    },
  );
}
