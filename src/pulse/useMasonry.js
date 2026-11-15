import { useLayoutEffect } from 'react';

/** The height of one grid row in a packed grid: small, so a card's span follows its height closely. */
export const MASONRY_ROW = 4;

/** How many rows a card of `height` px spans, the gap below it included; null when the height cannot be read. */
export function masonrySpan(height, gap) {
  if (!Number.isFinite(height)) return null;
  return Math.ceil((Math.max(0, height) + gap) / MASONRY_ROW);
}

/**
 * Packs the items of a CSS grid by their own heights (a masonry grid that keeps reading order): the grid gets small
 * rows and each item spans as many as its height needs, so a short card no longer leaves the space of the tallest card
 * in its row empty. The rows, the zero row gap and `align-items: start` are set on the element itself (and
 * `data-masonry` marks it), so it works on any card grid whatever its stylesheet says. Items are measured again
 * whenever their size changes (a picture loading, "Baca selengkapnya"). Without ResizeObserver, or when `active` is
 * false, the grid is left as its stylesheet draws it.
 * @param {{current: HTMLElement|null}} ref the grid element
 * @param {boolean} active
 * @param {unknown[]} deps what changes the items (the list itself)
 */
export default function useMasonry(ref, active, deps = []) {
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid || !active || typeof ResizeObserver === 'undefined') return undefined;
    // The vertical gap is read before the rows are set: it becomes part of each card's span.
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 12;
    // Set inline, so a page's own `gap` or `align-items` can never put a gap between the small rows or stretch a card.
    const kept = { gridAutoRows: grid.style.gridAutoRows, rowGap: grid.style.rowGap, alignItems: grid.style.alignItems };
    Object.assign(grid.style, { gridAutoRows: `${MASONRY_ROW}px`, rowGap: '0px', alignItems: 'start' });
    grid.setAttribute('data-masonry', '');
    const place = item => {
      const span = masonrySpan(item.getBoundingClientRect().height, gap);
      item.style.gridRowEnd = span ? `span ${span}` : '';
    };
    const observer = new ResizeObserver(entries => { for (const entry of entries) place(entry.target); });
    for (const item of grid.children) { place(item); observer.observe(item); }
    return () => {
      observer.disconnect();
      Object.assign(grid.style, kept);
      grid.removeAttribute('data-masonry');
      for (const item of grid.children) item.style.gridRowEnd = '';
    };
  }, [ref, active, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps -- the caller names what changes the items
}
