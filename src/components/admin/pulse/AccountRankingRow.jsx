import { PulseArrow } from '../../ui/PulseArrow';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { formatCount, safeSourceUrl } from '../../../lib/pulseData';
import { accountPostsLink } from '../../../lib/pulseDrilldown';
import AccountAvatar from './AccountAvatar';
import { PlatformTag } from '../../ui/PulseTag';

// A figure nobody reported is read out as unavailable, never as zero.
const figure = value => value == null ? <span aria-label="Tidak tersedia">—</span> : formatCount(value);

/** One account in the ranking table. `row.rank` is null when the figure the table is sorted by is unknown for
 * this account; `row.followers` is null when no post of the account reports it. `sort` names the ranked column. */
export default function AccountRankingRow({ row, sort, search }) {
  const sorted = key => sort === key ? 'pa-sorted' : undefined;
  const source = safeSourceUrl(row.url);
  return <tr>
    <td><span className="pulse-account"><span className="pulse-rank">{row.rank == null ? <span aria-label="Tanpa peringkat">—</span> : formatCount(row.rank)}</span><AccountAvatar author={row.author} platform={row.platform} size="sm"/><span><strong>{row.author || 'Penulis tidak diketahui'}</strong><small><PlatformTag platform={row.platform} size="sm"/></small></span></span></td>
    <td className={sorted('mentions')}>{row.key || row.author ? <Link className="pm-account-drilldown" to={accountPostsLink(search,row)} aria-label={`Lihat ${formatCount(row.mentions)} posting dari ${row.author || 'Penulis tidak diketahui'}`}>{formatCount(row.mentions)} <PulseArrow decorative/></Link> : formatCount(row.mentions)}</td>
    <td className={sorted('engagement')}>{figure(row.engagement)}{row.engagement != null && row.interaction_posts != null && <small className="pa-count">{`dari ${formatCount(row.interaction_posts)} posting`}</small>}</td>
    <td className={sorted('followers')}>{figure(row.followers)}</td>
    <td>{source && <a href={source} target="_blank" rel="noopener noreferrer" aria-label={'Buka sumber '+(row.author||'tanpa nama')}><ExternalLink size={15} aria-hidden="true"/></a>}</td>
  </tr>;
}
