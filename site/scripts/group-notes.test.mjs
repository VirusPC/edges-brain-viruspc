import assert from 'node:assert/strict';
import test from 'node:test';
import { groupNotesByMonth } from '../src/lib/group-notes.mjs';

function note(id, iso) {
  return { id, data: { date: new Date(`${iso}T00:00:00.000Z`) } };
}

test('groups newest year, then newest month, and skips empty months', () => {
  const groups = groupNotesByMonth([
    note('march', '2026-03-02'),
    note('oct-late', '2026-10-29'),
    note('oct-early', '2026-10-07'),
    note('last-year', '2025-12-01'),
  ]);

  assert.deepEqual(
    groups.map((year) => ({
      year: year.year,
      months: year.months.map((month) => ({
        label: month.label,
        ids: month.notes.map((item) => item.id),
      })),
    })),
    [
      {
        year: '2026',
        months: [
          { label: '2026-10', ids: ['oct-late', 'oct-early'] },
          { label: '2026-03', ids: ['march'] },
        ],
      },
      {
        year: '2025',
        months: [{ label: '2025-12', ids: ['last-year'] }],
      },
    ],
  );
});

test('uses UTC month boundaries and drops notes without a date', () => {
  const groups = groupNotesByMonth([
    { id: 'undated', data: {} },
    note('edge', '2026-01-01'),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].year, '2026');
  assert.deepEqual(groups[0].months.map((month) => month.label), ['2026-01']);
  assert.equal(groups[0].months[0].notes[0].id, 'edge');
});
