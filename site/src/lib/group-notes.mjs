/**
 * Bucket notes into year → month sections.
 * Years and months are newest first. Notes inside a month stay newest first.
 * Empty months are omitted because a month only exists when a note falls in it.
 *
 * @param {Array<{ id?: string, data?: { date?: Date } }>} notes
 * @returns {{ year: string, months: { key: string, label: string, notes: typeof notes }[] }[]}
 */
export function groupNotesByMonth(notes) {
  const sorted = [...notes].sort((a, b) => {
    const delta = timeOf(b) - timeOf(a);
    if (delta !== 0) return delta;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''), 'zh');
  });

  /** @type {{ year: string, months: { key: string, label: string, notes: typeof notes }[] }[]} */
  const years = [];
  /** @type {Map<string, { key: string, label: string, notes: typeof notes }[]>} */
  const monthsByYear = new Map();

  for (const note of sorted) {
    const date = note.data?.date;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) continue;
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    let months = monthsByYear.get(year);
    if (!months) {
      months = [];
      monthsByYear.set(year, months);
      years.push({ year, months });
    }
    let bucket = months.find((item) => item.key === key);
    if (!bucket) {
      bucket = { key, label: key, notes: [] };
      months.push(bucket);
    }
    bucket.notes.push(note);
  }

  return years;
}

/** @param {{ data?: { date?: Date } }} note */
function timeOf(note) {
  const date = note.data?.date;
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : Number.NEGATIVE_INFINITY;
}
