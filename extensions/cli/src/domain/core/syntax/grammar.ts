import type { SectionKey } from "./document.js";

/** One rendered section: a comment marker plus a heading. Names come from the caller. */
export interface SectionMark {
  marker: string;
  heading: string;
}

/**
 * Maps comment markers and headings onto document sections.
 * Core matches and renders these strings; it does not define them.
 */
export interface BlockGrammar {
  markers: Readonly<Record<string, SectionKey>>;
  headings: Readonly<Record<string, SectionKey>>;
  outerEnds: readonly string[];
  sections: Readonly<Record<SectionKey, SectionMark>>;
  outerStart: string;
  outerEnd: string;
}
