/**
 * Stable page anchor for a summary entry id.
 * Article ids are canonical links, project ids are repository URLs,
 * and model ids are official names. None of those are safe HTML ids.
 * base64url keeps the mapping one-to-one and free of spaces.
 * @param {string} id
 */
export function entryAnchor(id) {
  return `entry-${Buffer.from(String(id), 'utf8').toString('base64url')}`;
}
