// Single source for data colours. Values are CSS variables from analytics-kit.css,
// so charts follow the light and dark themes without re-rendering.
export const sentimentOrder = ['positive', 'neutral', 'negative', 'unknown'];
export const sentimentColor = {
  positive: 'var(--ps-sent-positive)',
  neutral: 'var(--ps-sent-neutral)',
  negative: 'var(--ps-sent-negative)',
  unknown: 'var(--ps-sent-unknown)',
};
export const sentimentTone = { positive: 'positive', neutral: 'neutral-sentiment', negative: 'negative', unknown: 'unknown' };
const platforms = ['instagram', 'tiktok', 'x', 'youtube', 'facebook', 'threads', 'reddit', 'news', 'web'];
export function platformColor(platform) {
  return platforms.includes(platform) ? `var(--ps-plat-${platform})` : 'var(--ps-muted)';
}
export const chartSeries = [1, 2, 3, 4, 5, 6].map(n => `var(--ps-chart-${n})`);
/** Share of a whole as a rounded percentage string; null when the whole is empty. */
export function sharePercent(value, total) {
  return total > 0 && Number.isFinite(value) ? Math.round(value / total * 100) + '%' : null;
}
