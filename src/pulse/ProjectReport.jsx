import { PulseLogo } from '../components/ui/PulseLogo';
import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {buildReport,freezeReport,reportArchive} from '../lib/pulseReport';
import {formatCount,pulseDate} from '../lib/pulseData';
import ReportPostCard from './ReportPostCard';
import {sentimentLabels} from '../lib/pulsePostFilters';
import {postsEvidenceLink} from '../lib/pulseDrilldown';
import {platformLabel,PlatformIcon} from '../components/admin/pulse/PlatformIcon';
import {PulseButton} from '../components/ui/PulseUI';
import './project-report.css';
import './report-brand.css';
import useResponseAnalysis from './useResponseAnalysis';
import {ResponseAnalysisView} from './ResponseAnalysisPanel';
import ReportArchive from './ReportArchive';
import {PulseStat,PulseStatGrid,PulseLegend} from '../components/ui/PulseAnalytics';
import {PlatformTag} from '../components/ui/PulseTag';
import {PulseEngagement} from '../components/ui/PulseEngagement';
import {sentimentColor,sentimentOrder,sentimentTone,sharePercent} from '../lib/pulseChartTheme';

const coverageLabels={observed:'Data tersimpan, bukan seluruh platform',empty:'Tidak ada data dalam periode ini',excluded:'Di luar platform terpilih'};
export default function ProjectReport(props) {
  const responseState=useResponseAnalysis(props.topic?.id);
  const scopeKey=JSON.stringify([props.topic?.id,props.period?.from,props.period?.to,props.selectedPlatforms==null?null:[...props.selectedPlatforms].sort()]);
  return <ReportSnapshot key={scopeKey} {...props} responseState={responseState}/>;
}
function ReportSnapshot({data,topic,period,selectedPlatforms=null,responseState}) {
  const [params]=useSearchParams();
  const [report,setReport]=useState(null);
  const [archive,setArchive]=useState(null);
  const [downloadError,setDownloadError]=useState('');
  const r=report||buildReport(data,topic,period,undefined,selectedPlatforms,responseState),total=r.posts.length;
  const ready=responseState.loaded&&!responseState.error;
  const download=()=>{
    if(!report)return;
    let url;
    try{
      url=URL.createObjectURL(new Blob([reportArchive(report)],{type:'application/json'}));
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=`pulse-report-${report.generatedAt.replace(/[:.]/g,'-')}.json`;
      document.body.appendChild(anchor);anchor.click();anchor.remove();setDownloadError('');
    }catch{setDownloadError('Unduhan belum berhasil. Coba unduh JSON kembali.');}
    finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}
  };
  const reportParams=new URLSearchParams(params);
  if(report){for(const key of ['from','to']){if(r.period[key])reportParams.set(key,r.period[key]);else reportParams.delete(key);}reportParams.set('platforms',r.selectedPlatforms===null?'all':r.selectedPlatforms.join(','));}
  const link=filters=>postsEvidenceLink(reportParams.toString(),filters);
  const peak=[...r.days].sort((a,b)=>b.total-a.total)[0];
  const max=Math.max(1,...r.days.map(day=>day.total));
  const coverage=total?Math.round(r.analyzed/total*100):0;
  const uniqueAccounts=new Set(r.posts.filter(p=>p.author).map(p=>JSON.stringify([p.platform,p.author]))).size;
  return <div className="pr-workspace">
    <div className="pr-tools" role="group" aria-label="Tindakan laporan">
      <div className="pr-state" role="status"><strong>{report?'Laporan dibekukan':'Draf langsung'}</strong><span>{report?'Angka tetap sampai Anda membuka draf baru.':responseState.error?'Respons gagal dimuat. Tunggu pemuatan ulang sebelum membekukan.':ready?'Posting dan respons mengikuti data terbaru.':'Menunggu hasil respons sebelum laporan dapat dibekukan.'}</span></div>
      <div className="pr-actions">{report?<PulseButton onClick={()=>{setReport(null);setArchive(null);setDownloadError('');}}>Buka draf baru</PulseButton>:<PulseButton variant="primary" disabled={!ready} onClick={()=>setReport(freezeReport(r))}>Buat &amp; bekukan laporan</PulseButton>}
        <PulseButton disabled={!report} onClick={download}>Unduh JSON</PulseButton>
        <PulseButton disabled={!report} onClick={()=>window.print()}>Cetak / PDF browser</PulseButton>
      </div>
    </div>
    {downloadError&&<p role="alert" className="pr-help">{downloadError}</p>}
    <details className="pr-help"><summary>Tentang snapshot dan ekspor</summary><p>Mengubah project, periode, atau platform membuka draf baru. Simpan snapshot ke server untuk membukanya kembali dari Arsip laporan. Snapshot yang hanya dibekukan belum tersimpan permanen.</p><p>Cetak membuka dialog browser, bukan mengunduh PDF otomatis. Pilih <strong>Save as PDF / Simpan sebagai PDF</strong>, kertas A4. Matikan header/footer browser untuk hasil bersih.</p></details>
    <ReportArchive topicId={topic.id} report={report} onOpen={(value,metadata)=>{setReport(value);setArchive(metadata);setDownloadError('');}}/>
    {archive&&<p className="pr-archived-context" role="status">Arsip: <strong>{archive.title}</strong> · Disimpan {pulseDate(archive.created_at)}. Periode dan platform di dokumen mengikuti snapshot, bukan pilihan dashboard saat ini.</p>}
    <nav className="pr-section-nav" aria-label="Bagian laporan"><a href="#report-summary">Ringkasan</a><a href="#report-sentiment">Sentimen</a><a href="#report-posts">Top posting</a><a href="#report-accounts">Akun & sumber</a><a href="#report-coverage">Cakupan</a></nav>
    <article className="pr-document" aria-label={report?'Laporan project siap cetak':'Draf laporan project'}>
      <div className="pr-masthead"><span className="pr-wordmark"><PulseLogo height={34} title="PULSE"/></span><span>Intelligence brief<br/><small>Laporan percakapan publik</small></span></div>
      <p className="pr-note">{report?`Snapshot dibekukan: ${pulseDate(r.generatedAt)}`:'Draf langsung, belum dibekukan.'}</p>
      <p>Platform: {r.selectedPlatforms===null?'Semua platform':r.selectedPlatforms.length?r.selectedPlatforms.map(platformLabel).join(', '):'Tidak ada platform dipilih'}</p>
      <header className="pr-cover"><span>PROJECT REPORT</span><h2>{r.topic.label}</h2><p>Periode publikasi: {r.period.from||'Awal data tersimpan'} sampai {r.period.to||'Akhir data tersimpan'} · WIB</p><p>Diperbarui: {pulseDate(r.generatedAt)}</p><p>Keyword: {r.topic.query||'Tidak tersedia'}</p></header>
      <div className="pr-facts"><PulseStatGrid label="Angka utama laporan"><PulseStat label="Posting" value={total} trend={r.days.map(day=>day.total)}/><PulseStat label="Akun & sumber unik" value={uniqueAccounts} note="Dihitung per platform"/><PulseStat label="Platform teramati" value={Object.keys(r.platforms).length}/><PulseStat label="Posting berlabel sentimen" value={r.analyzed} note={`dari ${formatCount(total)} posting · ${coverage}%`}/></PulseStatGrid></div>
      <section id="report-summary"><h2>01 / Ringkasan eksekutif</h2><p className="pr-lead">{total?`${formatCount(total)} posting terkumpul dari ${Object.keys(r.platforms).length} platform dalam periode terpilih.`:'Belum ada posting pada periode terpilih.'}</p><p>{r.analyzed} dari {total} posting telah memiliki label sentimen ({coverage}%). {r.counts.unknown>0?`Analisis belum lengkap: ${r.counts.unknown} posting belum dianalisis. Komposisi di bawah belum mewakili seluruh data terkumpul.`:'Seluruh posting dalam snapshot telah berlabel. Label AI masih dapat keliru.'}</p>{peak&&<p>Volume publikasi tertinggi dalam data tersimpan terjadi pada {peak.date}: {peak.total} posting. Ini bukan bukti cakupan seluruh percakapan publik.</p>}{r.accounts[0]&&<p>Akun/sumber dengan interaksi teramati terbesar: <strong>{r.accounts[0].author}</strong> ({platformLabel(r.accounts[0].platform)}), {formatCount(r.accounts[0].engagement)} interaksi pada {r.accounts[0].mentions} posting.</p>}<p className="pr-note">Sentimen menilai nada teks, bukan dukungan politik.</p><h3 className="pr-subhead">Rincian interaksi</h3><PulseEngagement posts={r.posts} label="Rincian interaksi laporan"/><p className="pr-note">Kualitas interaksi = (komentar + bagikan) ÷ (suka + komentar + bagikan). Rasio interaksi = interaksi ÷ tayangan dari posting yang melaporkan keduanya. Metrik yang tidak dikirim sumber tidak dihitung sebagai nol.</p></section>
      <section id="report-sentiment"><h2>02 / Sentimen & tren percakapan</h2><div className="pr-sentiment-strip"><PulseStatGrid label="Jumlah posting per sentimen">{sentimentOrder.map(key=><PulseStat key={key} as={Link} to={link({sentiment:key})} tone={sentimentTone[key]} label={sentimentLabels[key]} value={r.counts[key]} note={key==='unknown'?'Bukan netral':`${sharePercent(r.counts[key],total)||'0%'} dari seluruh posting`}/>)}</PulseStatGrid></div><p className="pr-note">Setiap baris adalah tanggal publikasi WIB yang tersedia. Panjang batang menunjukkan jumlah posting, termasuk yang belum dianalisis.</p>
        <PulseLegend items={sentimentOrder.map(key=>({key,label:sentimentLabels[key],color:sentimentColor[key],hatch:key==='unknown'}))}/>
        {r.days.map(day=><div className="pr-trend-row" key={day.date}><Link to={link({day:day.date})}>{day.date}</Link><div className="pr-trend-bar" aria-label={`${day.total} posting`} style={{width:`${day.total/max*100}%`}}>{sentimentOrder.map(key=><span key={key} className={key} style={{width:`${day[key]/day.total*100}%`}}/>)}</div><span>{day.total}</span><small>+ {day.positive} / = {day.neutral} / − {day.negative} / ? {day.unknown}</small></div>)}{!r.days.length&&<p>Belum ada data bertanggal.</p>}<p className="pr-note">+ positif · = netral · − negatif · ? belum dianalisis. {total-r.days.reduce((sum,d)=>sum+d.total,0)} posting tanpa tanggal valid dikecualikan dari tren. Hasil dapat berubah saat analisis dilengkapi.</p></section>
      <section id="report-posts"><h2>03 / Top posting</h2><p className="pr-note">10 posting dengan interaksi tertinggi dalam periode terpilih.</p><ol className="pr-posts">{r.topPosts.map((post,index)=><ReportPostCard key={post.id} post={post} rank={index+1}/>)}</ol>{!r.topPosts.length&&<p>Belum ada posting untuk diperingkat.</p>}</section>
      <section id="report-accounts"><h2>04 / Top influencer & sumber</h2><p className="pr-note">Peringkat interaksi teramati pada periode ini, bukan skor pengaruh atau audiens unik. Akun dihitung per platform; penerbit berita termasuk.</p><div className="pr-table-wrap"><table><thead><tr><th>Akun / sumber</th><th>Platform</th><th>Posting</th><th>Interaksi</th></tr></thead><tbody>{r.accounts.map(account=><tr key={account.platform+account.author}><td><Link to={link({author:account.author,platform:account.platform})}>{account.author}</Link></td><td><PlatformTag platform={account.platform} size="sm"/></td><td>{account.mentions}</td><td>{formatCount(account.engagement)}</td></tr>)}</tbody></table></div></section>
      <section id="report-coverage"><h2>05 / Cakupan & batasan</h2><div className="pr-table-wrap"><table><thead><tr><th>Sumber</th><th>Posting dalam snapshot</th><th>Cakupan</th></tr></thead><tbody>{r.sourceCoverage.map(({platform,count,status})=><tr key={platform}><td><PlatformIcon platform={platform}/> {platformLabel(platform)}</td><td>{count}</td><td>{coverageLabels[status]}</td></tr>)}</tbody></table></div><p>Sarkasme, konteks, dan kutipan dapat salah diklasifikasikan. Label belum tersedia tidak dianggap netral. Interaksi adalah snapshot likes, komentar dan share yang tersedia, bukan jumlah orang unik.</p><p>Laporan mengikuti project dan periode publikasi terpilih. Tautan dalam aplikasi membuka data terkini; dokumen PDF mempertahankan angka snapshot saat dicetak. Laporan ini bukan verifikasi kebenaran klaim dalam posting.</p></section>
      <ResponseAnalysisView posts={r.posts} {...r.responseAnalysis} printable/>
      <footer>PULSE · {pulseDate(r.generatedAt)} · {r.topic.label} · Cakupan analisis {coverage}%</footer>
    </article>
  </div>;
}
