import { Link } from 'react-router-dom';
import InfoTip from './InfoTip';
import { UnanalysedToggle } from './UnanalysedToggle';
import { PulseTag } from '../components/ui/PulseTag';
import { PulseArrow } from '../components/ui/PulseArrow';
import { formatCount } from '../lib/pulseData';
import { sentimentCounts, sentimentLabels } from '../lib/pulsePostFilters';
import { toneShares } from '../lib/pulseMeasures';
import { sentimentColor } from '../lib/pulseChartTheme';
import { stanceLabels, stanceShort } from '../lib/pulseResponse';
import { inVoice, kindHints, kindLabels, kindOrder, leading, neutralBreakdown, shares, voiceLabels } from '../lib/pulseVoice';

const order = ['negative', 'neutral', 'positive'];
const headline = { negative: 'negatif', neutral: 'netral', positive: 'positif' };

/** One voice: its leading share, the full split as a bar with a legend, and what its neutral part is made of.
 * tone_share_v1: the three are shares of the analysed posts; "belum dianalisis" is a count beside them, shown or hidden by the toggle. */
function Voice({ title, tip, basis, unit, counts, kinds, hideUnknown, primary = false, active, empty, action, children }) {
  const keys = [...order, ...(hideUnknown ? [] : ['unknown'])];
  const tone = toneShares(counts), lead = leading(counts), shown = keys.filter(key => counts[key] > 0);
  const said = key => (key === 'unknown' ? `${formatCount(counts.unknown)} ${unit}` : tone.text[key]);
  const neutral = counts.neutral, kindKeys = kindOrder.filter(key => kinds[key] > 0), kindPct = shares(kinds, kindOrder);
  const Heading = primary ? 'h2' : 'h3';
  return <article className="pvo-voice" data-primary={primary || undefined} data-active={active || undefined} data-mood={lead || 'unknown'}>
    <header><Heading>{title}</Heading>{tip}{action}</header>
    {lead ? <>
      <p className="pvo-lead"><strong>{tone.text[lead]}</strong> {headline[lead]}<small>{basis}</small></p>
      <div className="pvo-bar" role="img" aria-label={`${title}: ` + shown.map(key => `${sentimentLabels[key]} ${said(key)}`).join(', ')}>{shown.map(key => <span key={key} data-hatch={key === 'unknown' ? '' : undefined} style={{ flexGrow: counts[key], background: key === 'unknown' ? undefined : sentimentColor[key] }} />)}</div>
      <ul className="pvo-legend">{shown.map(key => <li key={key} title={`${formatCount(counts[key])} ${unit}`}><span className="psa-dot" data-tone={key} aria-hidden="true" />{sentimentLabels[key]} <b>{said(key)}</b></li>)}</ul>
      {neutral > 0 && kindKeys.length > 0 && <div className="pvo-kinds"><span>Netral terdiri dari</span><ul>{kindKeys.map(key => <li key={key} title={kindHints[key]} data-kind={key}>{kindLabels[key]} <b>{kindPct[key]}%</b></li>)}</ul></div>}
      {children}
    </> : <p className="pvo-empty">{empty}</p>}
  </article>;
}

/** The top card of the Sentiment page: public opinion read from comments, then what the public posts and what the press
 * reports, side by side on the same surface. `opinion` is `publicOpinion(comments)`; `voice` chooses which posts the rest of the page details.
 * Comments not analysed yet are coverage, not a category: opinion is always read from the analysed sample, with the coverage shown beside it. */
export default function VoiceOverview({ posts, opinion, loaded, hideUnknown, onHideUnknown, voice, onVoice, commentsLink }) {
  const sides = ['public', 'news'].map(key => { const rows = inVoice(posts, key); return { key, rows, counts: sentimentCounts(rows), kinds: neutralBreakdown(rows) }; });
  const waiting = sides.reduce((sum, side) => sum + side.counts.unknown, 0);
  const coverage = opinion.total ? opinion.analysed / opinion.total * 100 : 0;
  const stanceKeys = ['supports', 'opposes', 'unclear'], stancePct = shares(opinion.stance, stanceKeys);
  const postBasis = (side, noun) => `dari ${formatCount(side.rows.length - side.counts.unknown)} ${noun} yang sudah dianalisis`;
  return <section className="pvo" aria-label="Sentimen menurut siapa yang bicara">
    <Voice primary title="Opini publik" unit="komentar" hideUnknown counts={opinion.counts} kinds={opinion.kinds}
      tip={<InfoTip label="Tentang opini publik"><p>Dibaca dari komentar di bawah posting, tempat warganet menanggapi. Posting dan berita dibaca terpisah di bawahnya.</p><p>Komentar paling disukai pada posting teramai dianalisis lebih dulu, jadi angka ini sampel yang terus bertambah, bukan survei.</p></InfoTip>}
      action={waiting > 0 && <div className="pvo-toggle"><UnanalysedToggle hidden={hideUnknown} onChange={onHideUnknown} count={waiting} /></div>}
      basis={`dari ${formatCount(opinion.analysed)} komentar teranalisis pada ${formatCount(opinion.posts)} posting`}
      empty={!loaded ? 'Memuat hasil analisis komentar…' : opinion.total ? `${formatCount(opinion.total)} komentar menunggu analisis. Hasil masuk bertahap, komentar paling disukai lebih dulu.` : 'Belum ada komentar tersimpan pada cakupan ini.'}>
      {opinion.analysed > 0 && <div className="pvo-stance"><span>Sikap terhadap isu<InfoTip label="Tentang sikap"><p>Sikap yang dinyatakan komentar terhadap isu project: mendukung, menolak, atau hanya membahas. Nada negatif tidak otomatis berarti menolak.</p><p>Sikap dinilai terhadap nama project. Bila nama itu sebuah peristiwa atau tokoh, dukungan kepada tokohnya bisa terbaca sebagai dukungan kepada isunya; baca komentarnya sebelum menyimpulkan.</p></InfoTip></span>
        <ul>{stanceKeys.map(key => <li key={key} title={stanceLabels[key]}><span aria-hidden="true">{stanceShort[key][0]}</span>{stanceShort[key][1]} <b>{stancePct[key]}%</b></li>)}</ul>
        <Link to={commentsLink}>Baca komentarnya <PulseArrow /></Link></div>}
      {opinion.total > 0 && opinion.analysed > 0 && <p className="pvo-coverage"><span>Cakupan</span><i role="img" aria-label={`${Math.round(coverage)}% komentar sudah dianalisis`}><b style={{ width: `${Math.max(coverage, 1)}%` }} /></i><span>{formatCount(opinion.analysed)} dari {formatCount(opinion.total)} komentar tersimpan{opinion.analysed < opinion.total ? ' · bertambah otomatis' : ''}</span></p>}
    </Voice>
    <div className="pvo-sides">{sides.map(side => <Voice key={side.key} title={side.key === 'public' ? 'Posting warganet' : voiceLabels.news} unit={side.key === 'news' ? 'berita' : 'posting'} hideUnknown={hideUnknown} counts={side.counts} kinds={side.kinds} active={voice === side.key || voice === 'all'}
      tip={side.key === 'news' ? <InfoTip label="Tentang pemberitaan">Berita ditulis datar, jadi sebagian besar terbaca netral. Itu nada penulisan media, bukan ukuran opini publik.</InfoTip> : <InfoTip label="Tentang posting warganet">Posting di media sosial: X, Instagram, TikTok, YouTube, Reddit. Ini suara orang yang memulai percakapan; tanggapan atasnya ada di Opini publik.</InfoTip>}
      basis={postBasis(side, side.key === 'news' ? 'berita' : 'posting')}
      empty={side.rows.length ? `${formatCount(side.rows.length)} ${side.key === 'news' ? 'berita' : 'posting'} menunggu analisis.` : side.key === 'news' ? 'Tidak ada berita pada cakupan ini.' : 'Tidak ada posting media sosial pada cakupan ini.'} />)}</div>
    <div className="pvo-scope"><span id="pvo-scope-label">Rincian di bawah menampilkan</span><div className="pu-tag-group" role="group" aria-labelledby="pvo-scope-label">{['public', 'news', 'all'].map(key => <PulseTag key={key} size="lg" tone="accent" pressed={voice === key} onClick={() => onVoice(key)}>{voiceLabels[key]}</PulseTag>)}</div></div>
  </section>;
}
