// Single source for data colours. Sentiment and chart series are CSS variables from analytics-kit.css.
// Platform colours are built here from one hue per platform and the theme's ink token, so every chart,
// tag and map ring follows the light and dark themes (and print) without re-rendering.
export const sentimentOrder = ['positive', 'neutral', 'negative', 'unknown'];
export const sentimentColor = {
  positive: 'var(--ps-sent-positive)',
  neutral: 'var(--ps-sent-neutral)',
  negative: 'var(--ps-sent-negative)',
  unknown: 'var(--ps-sent-unknown)',
};
export const sentimentTone = { positive: 'positive', neutral: 'neutral-sentiment', negative: 'negative', unknown: 'unknown' };

/** Platform identity as OKLCH [lightness %, chroma, hue]: orientation only, never a quality signal.
 * One hue family per platform, close to how people know it (X is ink, see `platformColor`). The steps were
 * chosen so that every pair stays apart on thin rings and small dots in both themes, and so that the
 * platforms collected today (Instagram, TikTok, X, YouTube, Berita, Reddit) also stay apart for red-green
 * colour blindness. pulseChartTheme.test.js holds that; rerun it after changing a value. */
export const platformHues = {
  instagram: [68, 0.25, 335],  // magenta
  tiktok: [55, 0.105, 213],    // teal
  youtube: [60, 0.25, 24],     // red
  facebook: [68, 0.165, 269],  // periwinkle blue
  threads: [49, 0.21, 296],    // violet
  news: [68, 0.17, 153],       // green
  reddit: [71, 0.17, 66],      // amber orange
  web: [53, 0.13, 107],        // olive
};
/** Share of the platform hue in the mix; the rest is the theme ink, which darkens the colour on light
 * surfaces and lightens it on dark ones. */
export const platformInkMix = { hue: 82, x: 88 };

export function platformColor(platform) {
  // X has no hue of its own: softened ink, dark on light surfaces and light on dark ones.
  if (platform === 'x') return `color-mix(in oklab, var(--ps-ink, CanvasText) ${platformInkMix.x}%, var(--ps-bg, Canvas))`;
  const hue = platformHues[platform];
  return hue ? `color-mix(in oklab, oklch(${hue[0]}% ${hue[1]} ${hue[2]}) ${platformInkMix.hue}%, var(--ps-ink, CanvasText))` : 'var(--ps-muted)';
}
export const chartSeries = [1, 2, 3, 4, 5, 6].map(n => `var(--ps-chart-${n})`);
/** Share of a whole as a rounded percentage string; null when the whole is empty. */
export function sharePercent(value, total) {
  return total > 0 && Number.isFinite(value) ? Math.round(value / total * 100) + '%' : null;
}
