export const splitKeywordTerms = value => (value || '').split(',').map(term => term.trim()).filter(Boolean);
/** Append confirmed terms to a comma-separated keyword field, skipping ones already there. */
export const mergeTerms = (value, terms) => [...new Map([...splitKeywordTerms(value), ...terms].map(term => [term.toLocaleLowerCase('id'), term])).values()].join(', ');
/** Add confirmed terms to a hand-written Boolean query: variations widen it (OR), context narrows it (AND), exclusions drop matches (NOT). */
export function appendToQuery(query, added) {
  const quote = term => `"${term.replace(/["\\()]/g, '')}"`;
  const base = query.trim();
  const widened = added.variation.length ? `(${[base, ...added.variation.map(quote)].filter(Boolean).join(' OR ')})` : base;
  return widened + added.context.map(term => ` AND ${quote(term)}`).join('') + added.exclude.map(term => ` NOT ${quote(term)}`).join('');
}
