/**
 * Index of the section whose top has reached the reading line.
 * Headings are in document order. A heading still below the line keeps the previous one current.
 * @param {number[]} tops
 * @param {number} line
 */
export function currentSectionIndex(tops, line) {
  if (!tops.length) return -1;
  let chosen = 0;
  for (let index = 0; index < tops.length; index += 1) {
    if (tops[index] <= line) chosen = index;
    else break;
  }
  return chosen;
}
