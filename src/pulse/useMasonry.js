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
 * rows (`data-masonry` on the element, styled in CSS) and each item spans as many as its height needs, so a short card
 * no longer leaves the space of the tallest card in its row empty. Items are measured again whenever their size
 * changes (a picture loading, "Baca selengkapnya"). Without ResizeObserver, or when `active` is false, the grid stays
 * a normal grid whose items keep their own heights.
 * @param {{current: HTMLElement|null}} ref the grid element
 * @param {boolean} active
 * @param {unknown[]} deps what changes the items (the list itself)
 */
export default function useMasonry(ref, active, deps = []) {
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid || !active || typeof ResizeObserver === 'undefined') return undefined;
    grid.setAttribute('data-masonry', '');
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 12;
    const place = item => {
      const span = masonrySpan(item.getBoundingClientRect().height, gap);
      item.style.gridRowEnd = span ? `span ${span}` : '';
    };
    const observer = new ResizeObserver(entries => { for (const entry of entries) place(entry.target); });
    for (const item of grid.children) { place(item); observer.observe(item); }
    return () => {
      observer.disconnect();
      grid.removeAttribute('data-masonry');
      for (const item of grid.children) item.style.gridRowEnd = '';
    };
  }, [ref, active, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps -- the caller names what changes the items
}
