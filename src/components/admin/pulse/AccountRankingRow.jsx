import { PulseArrow } from '../../ui/PulseArrow';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { formatCount, safeSourceUrl } from '../../../lib/pulseData';
import { accountPostsLink } from '../../../lib/pulseDrilldown';
import PostAvatar from './PostAvatar';
import { PlatformTag } from '../../ui/PulseTag';

export default function AccountRankingRow({ row, rank, posts, total, search }) {
  const example = posts.find(post => post.author === row.author && post.platform === row.platform && (post.metrics?.profile_image_url || post.metrics?.avatar_url))
    || posts.find(post => post.author === row.author && post.platform === row.platform)
    || row;
  return <tr>
    <td><span className="pulse-account"><span className="pulse-rank">{rank}</span><PostAvatar post={example}/><span><strong>{row.author || 'Penulis tidak diketahui'}</strong><small><PlatformTag platform={row.platform} size="sm"/></small></span></span></td>
    <td>{row.author ? <Link className="pm-account-drilldown" to={accountPostsLink(search,row)} aria-label={`Lihat ${row.mentions} posting dari ${row.author}`}>{formatCount(row.mentions)} <PulseArrow/></Link> : formatCount(row.mentions)}</td>
    <td>{formatCount(row.engagement)}</td>
    <td>{total ? <span className="pu-share-cell">{((row.mentions/total)*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%'}<span className="pu-breakdown-track" aria-hidden="true"><i style={{width:`${Math.min(100,row.mentions/total*100)}%`}}/></span></span> : '—'}</td>
    <td>{safeSourceUrl(row.url) && <a href={safeSourceUrl(row.url)} target="_blank" rel="noopener noreferrer" aria-label={'Buka sumber '+row.author}><ExternalLink size={15}/></a>}</td>
  </tr>;
}
