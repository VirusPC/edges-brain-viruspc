export const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const blockPattern = (start: string, end: string) =>
  new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

export const appendBlock = (text: string, block: string) =>
  text +
  (text.endsWith("\n\n") ? "" : text.endsWith("\n") ? "\n" : "\n\n") +
  block;
