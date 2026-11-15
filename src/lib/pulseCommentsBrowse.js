// The Comments page's list, as pure functions: how far one more step goes, and how the choice beyond the automatic lane
// is named. Kept out of CommentsPanel.jsx so that file exports components only.
import { formatCount } from './pulseData.js';

/** Cards the list opens with, and how many one more step adds. */
export const PAGE = 12, MORE = 24;

/** How many cards to show after one more step: the next MORE, never past the list. */
export const nextShown = (shown, total) => Math.min(total, shown + MORE);

/** The name of the choice to collect beyond the automatic lane, by the size the server reports for that lane. */
export function outsideTop(coverage) {
  return Number.isFinite(coverage?.auto_top) ? `Ambil di luar ${formatCount(coverage.auto_top)} besar` : 'Ambil komentar posting lain';
}
