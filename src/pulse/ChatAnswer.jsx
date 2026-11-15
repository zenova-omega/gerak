import { MessagesSquare } from 'lucide-react';
import AccountAvatar from '../components/admin/pulse/AccountAvatar';
import { platformLabel } from '../components/admin/pulse/PlatformIcon';
import { PulseArrow } from '../components/ui/PulseArrow';
import { answerView, chartRows } from '../lib/pulseChatAnswer';
import { formatCount, pulseDate, safeSourceUrl } from '../lib/pulseData';
import { zone } from '../lib/pulseMeasures';
import './ds/chat-answer.css';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
/** "2026-11-10 12:13" (the server's stamp in the installation's zone) as "10 Nov, 12.13 WIB". Anything else is shown as it came. */
function stamp(value) {
  const found = String(value || '').match(/^\d{4}-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!found) return value || '';
  return `${Number(found[2])} ${months[Number(found[1]) - 1]}` + (found[3] ? `, ${found[3]}.${found[4]} ${zone().name}` : '');
}

/** Text with its bold runs and its evidence marks. A mark is a small round number that jumps to its row below. */
function Parts({ parts, turn, names }) {
  return parts.map((part, index) => part.mark
    ? <a key={index} className="pca-mark" href={`#pc-${turn}-${part.mark}`} aria-label={`Bukti ${part.mark}: ${names.get(part.mark)}`} title={names.get(part.mark)}>{part.mark}</a>
    : part.bold ? <strong key={index}>{part.text}</strong> : part.text);
}

/** One chart of an answer. Every number comes from the server; the bars only repeat what the words beside them say. */
function Chart({ chart }) {
  const rows = chartRows(chart, platformLabel), unit = chart.unit || 'posting';
  if (!rows.length) return null;
  const head = <figcaption><strong>{chart.title}</strong><span>dalam {unit}</span></figcaption>;
  if (chart.kind === 'days') {
    const first = rows[0], last = rows.at(-1), peak = rows.find(row => row.peak);
    return <figure className="pcc pcc-time">{head}
      <div className="pcc-days" role="img" aria-label={`${chart.title}, ${first.label} sampai ${last.label}.${peak ? ` Tertinggi ${formatCount(peak.value)} ${unit} pada ${peak.label}.` : ''}`}>
        {rows.map(row => <span key={row.key} title={`${row.label}: ${formatCount(row.value)} ${unit}`} data-peak={row.peak ? '' : undefined}><i style={{ height: Math.max(row.width, row.value ? 4 : 0) + '%' }} /></span>)}
      </div>
      <div className="pcc-axis"><span>{first.label}</span>{peak && <span>tertinggi {formatCount(peak.value)} pada {peak.label}</span>}<span>{last.label}</span></div>
      {chart.note && <p className="pcc-note">{chart.note}</p>}
    </figure>;
  }
  return <figure className="pcc">{head}
    <ul className="pcc-bars" data-shares={rows[0].share ? '' : undefined}>{rows.map(row => <li key={row.key}>
      <span className="pcc-label">{row.label}</span>
      <span className="pcc-track" aria-hidden="true"><i style={{ width: row.width + '%', background: row.color }} /></span>
      <span className="pcc-value">{formatCount(row.value)}</span>
      {row.share && <span className="pcc-share">{row.share}</span>}
    </li>)}</ul>
    {chart.note && <p className="pcc-note">{chart.note}</p>}
  </figure>;
}

/**
 * One Tanya AI answer: the lead sentence, the supporting paragraphs and lists with bold key words, the charts the
 * answer asked for, and the evidence it cites. A cited post or conversation group is a round numbered mark in the
 * text and carries the same mark on its row below, so the eye finds it at once (the mark is also a link to the row).
 * The model's raw marks ("**", "[P1]") never reach the reader; see src/lib/pulseChatAnswer.js.
 * @param {{turn: {answer?: string, sources?: object[], groups?: object[], charts?: object[]}, index: number}} props `index` keeps the row ids of two answers apart
 */
export default function ChatAnswer({ turn, index = 0 }) {
  const view = answerView(turn);
  const names = new Map(view.evidence.map(row => [row.number, row.kind === 'post' ? `posting ${row.source.author || 'tanpa nama'}` : `kelompok percakapan ${row.group.title}`]));
  const parts = list => <Parts parts={list} turn={index} names={names} />;
  return <>
    <div className="pc-answer-text">
      {view.lead.length > 0 && <p className="pca-lead">{parts(view.lead)}</p>}
      {view.blocks.map((block, at) => block.type === 'list'
        ? <ul className="pca-list" key={at}>{block.items.map((item, row) => <li key={row}>{parts(item)}</li>)}</ul>
        : <p key={at}>{parts(block.parts)}</p>)}
    </div>
    {view.charts.length > 0 && <div className="pcc-row">{view.charts.map(chart => <Chart key={chart.key} chart={chart} />)}</div>}
    {view.evidence.length > 0 && <ol className="pc-sources" aria-label="Bukti yang dirujuk">{view.evidence.map(row => <li id={`pc-${index}-${row.number}`} key={row.number}>
      <span className="pca-mark pca-mark-row" aria-label={`Bukti ${row.number}`}>{row.number}</span>
      {row.kind === 'post' ? <>
        <div className="pc-source-body">
          <span className="pu-account-line"><AccountAvatar size="xs" author={row.source.author} platform={row.source.platform} /><strong>{row.source.author || 'Nama sumber tidak tersedia'}</strong></span>
          <p>{row.source.text || 'Teks tidak tersedia'}</p>
          <span className="pc-source-meta">{row.source.published_at ? pulseDate(row.source.published_at) : 'Tanggal tidak tersedia'}{row.source.interactions != null && <> · {formatCount(row.source.interactions)} interaksi</>}</span>
        </div>
        {safeSourceUrl(row.source.url) && <a className="pc-source-link" href={safeSourceUrl(row.source.url)} target="_blank" rel="noopener noreferrer" aria-label={`Buka posting ${row.source.author || row.number}`}><PulseArrow /></a>}
      </> : <div className="pc-source-body">
        <span className="pu-account-line pca-group"><MessagesSquare size={16} aria-hidden="true" /><strong>Kelompok percakapan</strong></span>
        <p>{row.group.title}</p>
        <span className="pc-source-meta">{formatCount(row.group.posts)} posting · {formatCount(row.group.accounts)} akun · {formatCount(row.group.interactions)} interaksi{row.group.interactions != null && row.group.interaction_posts ? ` dari ${formatCount(row.group.interaction_posts)} posting` : ''}{row.group.first_published_at ? ` · mulai ${stamp(row.group.first_published_at)}` : ''}</span>
      </div>}
    </li>)}</ol>}
  </>;
}
