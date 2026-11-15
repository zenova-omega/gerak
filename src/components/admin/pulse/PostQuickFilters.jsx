import { filterPosts, sentimentCounts, sentimentLabels } from '../../../lib/pulsePostFilters';
import PlatformCheckboxes from './PlatformCheckboxes';
import { PulseButton } from '../../ui/PulseUI';

export default function PostQuickFilters({ posts, filters, onApply }) {
  const platforms = [...new Set(posts.map(post => post.platform))];
  const counts = filterPosts(posts, { ...filters, platforms: null }).reduce((result, post) => {
    result[post.platform] = (result[post.platform] || 0) + 1;
    return result;
  }, Object.fromEntries(platforms.map(platform => [platform, 0])));
  const sentiments = sentimentCounts(filterPosts(posts, { ...filters, sentiments: null }));
  return <aside className="pm-quick-filters" aria-label="Filter cepat posting">
    <div className="pm-rail-heading"><h3>Filter cepat</h3><span>Langsung diterapkan</span></div>
    <PlatformCheckboxes platforms={platforms} counts={counts} value={filters.platforms} onChange={platforms => onApply({ ...filters, platforms })} />
    <fieldset className="pm-sentiment-picker"><legend>Sentimen</legend>
      <PulseButton variant="quiet" onClick={() => onApply({ ...filters, sentiments: null })}>Semua sentimen</PulseButton>
      {Object.entries(sentimentLabels).map(([key, label]) => <label key={key}>
        <input type="checkbox" checked={filters.sentiments === null || filters.sentiments.includes(key)} onChange={event => {
          const current = filters.sentiments ?? Object.keys(sentimentLabels);
          onApply({ ...filters, sentiments: event.target.checked ? [...current, key] : current.filter(value => value !== key) });
        }} />
        <span className={'pm-sentiment-dot ' + key} aria-hidden="true" /><span>{label}</span><small>{sentiments[key]}</small>
      </label>)}
    </fieldset>
  </aside>;
}
