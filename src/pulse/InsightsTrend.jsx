import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePulseAnalytics } from '../hooks/usePulse';
import { filterPosts } from '../lib/pulsePostFilters';
import { postsEvidenceLink } from '../lib/pulseDrilldown';
import useProjectPeriod from './useProjectPeriod';
import useProjectPlatforms from './useProjectPlatforms';
import TrendChart from './TrendChart';

/** The small trend beside AI Insights: posts and interactions for the period and platforms chosen in the project bar.
 * It draws nothing until the posts have arrived, so the column never shows an empty frame. A click opens that day on Posting. */
export default function InsightsTrend() {
  const [params] = useSearchParams(), navigate = useNavigate();
  const topicId = params.get('topic') || '';
  const [period] = useProjectPeriod(topicId);
  const [platforms] = useProjectPlatforms(topicId);
  const analytics = usePulseAnalytics(topicId, null, period);
  if (!topicId || !analytics.data) return null;
  const posts = filterPosts(analytics.data.posts || [], { platforms, from: period.from, to: period.to });
  if (!posts.length) return null;
  return <TrendChart compact title="Posting dan interaksi" posts={posts} period={period}
    onPick={row => navigate(postsEvidenceLink(params.toString(), { day: row.from, day_to: row.to !== row.from ? row.to : '' }))} />;
}
