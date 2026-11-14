import { createElement, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PulseLoader } from '../components/ui/PulseLoader';
import { PulseLike, PulseComment, PulseShare, PulseView, PulseBeat } from '../components/ui/PulseMetricIcons';
import { PulseEngagement } from '../components/ui/PulseEngagement';
import { PulseButton, PulseBadge, PulseNotice, PulseMetric } from '../components/ui/PulseUI';
import PlatformCheckboxes from '../components/admin/pulse/PlatformCheckboxes';
import './design-system-gallery.css';
import {PulsePanelHeading,PulseSourceHeading} from '../components/ui/PulsePatterns';
import AnalyticsPanel from './AnalyticsPanel';
import { PulseArrow } from '../components/ui/PulseArrow';
import { PulseTag, SentimentTag, PlatformTag, KeywordTag, PulseDelta } from '../components/ui/PulseTag';
import { PulseStat, PulseStatGrid, PulseLegend, PulseDistribution, PulseBreakdown, PulsePanelEmpty } from '../components/ui/PulseAnalytics';
import { PlatformIcon, platformLabel } from '../components/admin/pulse/PlatformIcon';
import { sentimentColor, sentimentOrder, platformColor, chartSeries } from '../lib/pulseChartTheme';
import { sentimentLabels } from '../lib/pulsePostFilters';

const sampleSentiment = { positive: 128, neutral: 302, negative: 64, unknown: 41 };
const samplePlatforms = [['instagram', 212], ['tiktok', 148], ['x', 96], ['news', 54], ['youtube', 25]];
const sampleTrend = [12, 18, 15, 31, 44, 38, 52, 47, 61, 58];

/** Live component reference. Examples never query providers or mutate project data. */
export default function DesignSystemGallery(){
  const [platforms,setPlatforms]=useState(null);
  const [filters,setFilters]=useState(['Instagram','Negatif','7 hari terakhir']);
  const [pressed,setPressed]=useState(true);
  const sentimentTotal=Object.values(sampleSentiment).reduce((a,b)=>a+b,0);
  return <section id="pulse-design-system" className="pu-gallery" aria-label="PULSE design system">
    <header><span className="pu-eyebrow">PULSE / UI foundations</span><h2>Tenang. Tepercaya. Tajam.</h2><p>Referensi komponen yang dipakai aplikasi. Semua angka di bagian ini adalah contoh, bukan data monitoring.</p></header>
    <section><h3>Warna dengan peran</h3><div className="pu-swatches">{[['Netral','--ps-panel'],['Pilihan','--ps-selected'],['Aksen','--ps-lavender'],['Berhasil','--ps-mint'],['Perhatian','--ps-peach'],['Informasi','--ps-info']].map(([label,token])=><div key={token}><span style={{background:`var(${token})`}}/><strong>{label}</strong><code>{token}</code></div>)}</div></section>
    <section aria-label="Pola kartu bersama"><h3>Komponen kartu PULSE</h3><p>Satu susunan identitas dipakai di posting, bukti sentimen, ikhtisar dan laporan.</p><PulseSourceHeading post={{author:'Contoh penerbit',platform:'instagram',published_at:'2026-11-13T03:00:00Z'}} rank={1}><PulseBadge>Contoh</PulseBadge></PulseSourceHeading><PulseSourceHeading post={{author:'Contoh nama akun yang panjang untuk memeriksa pembungkusan teks',platform:'threads'}}/><AnalyticsPanel title="Panel analisis" description="Temuan utama, visualisasi, lalu bukti."><p>Area grafik atau perbandingan. Tidak ada data monitoring dalam contoh ini.</p></AnalyticsPanel><PulsePanelHeading title="Panel dengan tindakan" description="Status dan aksi tetap terpisah dari judul."><PulseButton disabled>Contoh tindakan</PulseButton></PulsePanelHeading></section>
    <section><h3>Hierarki tindakan</h3><div className="pu-example-row"><PulseButton variant="primary">Tindakan utama</PulseButton>Tampil paling menonjol, satu per kelompok.</div><div className="pu-example-row"><PulseButton>Tindakan sekunder</PulseButton><PulseButton variant="quiet">Tindakan ringan</PulseButton><PulseButton disabled>Tidak tersedia</PulseButton><PulseButton busy busyLabel="Memproses…"/></div><div className="pu-example-row"><PulseButton variant="primary" arrow>Lihat posting</PulseButton><PulseButton arrow>Buka sumber</PulseButton><a href="#pulse-design-system">Tautan ke bukti <PulseArrow/></a><span className="pu-arrow-specimen"><PulseArrow size={40} decorative/></span>Panah PULSE: diagonal dengan satu denyut. Dipakai setiap kali tindakan membuka sumber atau tampilan lebih rinci. Tombol memiliki tepi bawah tegas yang menutup saat ditekan.</div></section>
    <section aria-label="Sistem kontrol"><h3>Kontrol: satu skala tinggi</h3><p>Tombol, dropdown, input, dan chip filter memakai token <code>--ps-control-*</code>. Standar 44px; ringkas 36px untuk chip dan baris padat; 32px hanya untuk tombol info.</p>
      <div className="pu-control-specimen">
        <div className="pu-example-row"><PulseButton variant="primary">Utama</PulseButton><PulseButton>Sekunder</PulseButton><PulseButton variant="quiet">Ringan</PulseButton><PulseButton variant="reverse">Reverse</PulseButton><PulseButton iconOnly aria-label="Contoh tombol ikon"><SlidersHorizontal/></PulseButton><code>md · 44px</code></div>
        <div className="pu-example-row"><PulseButton size="sm" variant="primary">Utama</PulseButton><PulseButton size="sm">Sekunder</PulseButton><PulseButton size="sm" variant="quiet">Ringan</PulseButton><PulseButton size="sm" variant="reverse">Reverse</PulseButton><PulseButton size="sm" iconOnly aria-label="Contoh tombol ikon ringkas"><SlidersHorizontal/></PulseButton><code>sm · 36px</code></div>
        <div className="pu-example-row pu-surface-tint"><PulseButton variant="reverse">Reverse di permukaan berwarna</PulseButton><PulseButton>Sekunder</PulseButton></div>
        <div className="pu-example-row"><label>Dropdown<select defaultValue="a"><option value="a">Interaksi tertinggi</option><option value="b">Terbaru dahulu</option></select></label><label>Input<input type="search" placeholder="Cari dalam posting"/></label><PulseButton><SlidersHorizontal/>Filter lanjutan</PulseButton></div>
        <div className="pu-example-row"><div className="pu-tag-group" role="group" aria-label="Contoh chip filter"><PulseTag size="lg" tone="accent" pressed onClick={()=>{}}>Terpilih</PulseTag><PulseTag size="lg" pressed={false} onClick={()=>{}}>Tidak terpilih</PulseTag><PulseTag size="lg" dot tone="positive" pressed count="35" onClick={()=>{}}>Positif</PulseTag></div><code>chip · 36px</code></div>
      </div>
    </section>
    <section aria-label="Permukaan dan pencarian"><h3>Permukaan, judul, dan pencarian</h3><p>Kartu dan panel memakai token <code>--ps-surface-*</code>; judul memakai <code>--ps-title-*</code>; sidebar memakai <code>--ps-sidebar-*</code> dan <code>--ps-nav-*</code>.</p>
      <div className="pu-surface-specimen"><div><strong>Kartu</strong><code>radius 12px · padding 20px</code></div><div><strong>Blok dalam panel</strong><code>padding 16px</code></div><div><strong>Judul panel 20px</strong><code>judul blok 16px</code></div></div>
      <div className="pu-example-row"><form className="pu-search" role="search" aria-label="Contoh kolom cari" onSubmit={event=>event.preventDefault()} style={{flex:'0 1 320px'}}><Search aria-hidden="true"/><input type="search" placeholder="Cari posting atau akun…" aria-label="Contoh kolom cari"/></form></div>
    </section>
    <section aria-label="Kartu KPI"><h3>Kartu KPI</h3><p>Label, angka dengan perubahannya, satu visual (meter persentase atau garis tren), lalu catatan. Warna menyatakan arti: merah berarti memburuk, hijau membaik, abu tanpa penilaian. Panah menyatakan arah.</p>
      <PulseStatGrid label="Contoh kartu KPI"><PulseStat label="Negatif" tone="negative" value={267} share={26} shareLabel="dari yang dianalisis" delta={32} deltaUnit="" deltaIntent="bad" deltaNote="vs 7 hari sebelumnya" trend={[4,6,5,9,12,18,22]}/><PulseStat label="Negatif" tone="negative" value={120} share={12} shareLabel="dari yang dianalisis" delta={-18} deltaUnit="" deltaIntent="good" deltaNote="vs 7 hari sebelumnya" trend={[22,18,15,12,9,7,5]}/><PulseStat label="Posting" value={1333} delta={14.5} deltaNote="vs 7 hari sebelumnya" trend={[40,52,48,61,70,66,81]}/><PulseStat label="Interaksi" value={61405645} share={64} shareLabel="posting bermetrik"/></PulseStatGrid>
    </section>
    <section aria-label="Menunggu"><h3>Menunggu</h3><p>Titik yang berdetak dipakai saat pembaca menunggu jawaban. Isi halaman yang sedang dimuat memakai kerangka.</p><div className="pu-example-row"><PulseLoader size="lg" label="Memeriksa sesi PULSE…"/><PulseLoader label="Menyusun summary…"/><PulseLoader inline label="Menyusun jawaban dari data tersimpan…"/></div></section>
    <section aria-label="Tata letak halaman"><h3>Tata letak halaman</h3><p>Setiap halaman disusun dari baris 12 kolom. Hanya empat bentuk baris yang dipakai, dan kartu dalam satu baris selalu sama tinggi.</p>
      <div className="pu-layout-specimen">
        {[['12', 'Penuh', 'Jawaban utama halaman, tabel, linimasa, daftar bukti', [12]], ['8 + 4', 'Dua pertiga + sepertiga', 'Grafik atau daftar dengan rincian, kunci, atau filternya', [8, 4]], ['6 + 6', 'Setengah + setengah', 'Dua hal setara yang dibandingkan', [6, 6]], ['4 + 4 + 4', 'Tiga sama lebar', 'Tiga ringkasan sejenis; tidak pernah lebih dari tiga kartu per baris', [4, 4, 4]]].map(([code, name, use, spans]) => <div key={code}><div className="pu-layout-row" aria-hidden="true">{spans.map((span, index) => <i key={index} style={{ gridColumn: `span ${span}` }} />)}</div><strong>{code} · {name}</strong><span>{use}</span></div>)}
      </div>
      <ol className="pu-layout-rules"><li>Baris pertama selalu satu kartu penuh yang menjawab pertanyaan halaman. Sakelar dan filter yang berlaku untuk seluruh halaman ada di kartu itu.</li><li>Kolom sepertiga hanya untuk rincian, kunci, atau filter, bukan isi utama.</li><li>Urutan dari atas: apa dan seberapa besar, bagaimana nadanya, apa isinya, siapa penggeraknya, lalu rincian dan metode.</li><li>Jarak antar kartu 16px. Kartu tidak diberi bayangan dan tidak berisi kartu berbingkai lain.</li></ol>
    </section>
    <section><h3>Status yang dapat dibaca</h3><div className="pu-example-row"><PulseBadge tone="success">Berhasil diambil</PulseBadge><PulseBadge tone="warning">Cakupan terbatas</PulseBadge><PulseBadge tone="danger">Gagal diambil</PulseBadge><PulseBadge tone="info">Dalam antrean</PulseBadge><PulseBadge>Belum dianalisis</PulseBadge></div><PulseNotice>Status pengumpulan tidak sama dengan sentimen. Label tidak bergantung pada warna saja.</PulseNotice></section>
    <section aria-label="Warna data"><h3>Warna data</h3><p>Terpisah dari warna status. Sentimen dan platform memiliki token sendiri; "Belum dianalisis" memakai arsiran agar tidak terbaca sebagai netral.</p>
      <div className="pu-swatches">{sentimentOrder.map(key=><div key={key}><span className={key==='unknown'?'pu-swatch-hatch':undefined} style={{background:key==='unknown'?undefined:sentimentColor[key]}}/><strong>{sentimentLabels[key]}</strong><code>--ps-sent-{key}</code></div>)}</div>
      <div className="pu-swatch-strip" aria-label="Warna platform">{['instagram','tiktok','x','youtube','facebook','threads','news','web'].map(key=><span key={key} title={platformLabel(key)} style={{background:platformColor(key)}}><PlatformIcon platform={key} size={14}/></span>)}</div>
      <div className="pu-swatch-strip" aria-label="Seri kategorikal">{chartSeries.map((color,index)=><span key={color} style={{background:color}}>{index+1}</span>)}</div>
    </section>
    <section aria-label="Tag"><h3>Tag</h3><p>Satu anatomi untuk sentimen, platform, status, keyword dan filter. Tinggi 24px, radius 6px, selalu berlabel teks.</p>
      <div className="pu-example-row">{sentimentOrder.map(key=><SentimentTag key={key} value={key}/>)}</div>
      <div className="pu-example-row">{['instagram','tiktok','x','youtube','news'].map(key=><PlatformTag key={key} platform={key}/>)}<PlatformTag platform="instagram" count={212}/></div>
      <div className="pu-example-row"><PulseTag tone="success" dot>Berhasil diambil</PulseTag><PulseTag tone="warning" dot>Cakupan terbatas</PulseTag><PulseTag tone="danger" dot>Gagal diambil</PulseTag><PulseTag tone="info" dot>Dalam antrean</PulseTag><PulseTag tone="accent">Baru</PulseTag><PulseTag>Contoh</PulseTag></div>
      <div className="pu-example-row"><KeywordTag>#contohtagar</KeywordTag><KeywordTag count={38}>kata kunci</KeywordTag><PulseTag size="sm">Kecil</PulseTag><PulseTag size="lg" variant="outline">Besar</PulseTag><PulseTag variant="solid" tone="negative">Solid</PulseTag></div>
      <div className="pu-example-row"><PulseTag tone="accent" pressed={pressed} onClick={()=>setPressed(v=>!v)}>Tag pilihan (toggle)</PulseTag>{filters.map(name=><PulseTag key={name} variant="outline" onRemove={()=>setFilters(list=>list.filter(item=>item!==name))} removeLabel={'Hapus filter '+name}>{name}</PulseTag>)}{!filters.length&&<PulseTag variant="outline" onClick={()=>setFilters(['Instagram','Negatif','7 hari terakhir'])}>Pulihkan contoh filter</PulseTag>}</div>
      <div className="pu-example-row"><PulseDelta value={12.4}/><PulseDelta value={-8}/><PulseDelta value={0}/><PulseDelta value={5} unit=" posting" intent="good"/><PulseDelta value={9.5} intent="bad"/>Perubahan netral secara bawaan; hijau atau merah hanya bila arah memang bermakna baik atau buruk.</div>
    </section>
    <section aria-label="Kartu statistik"><h3>Strip statistik</h3><p>Satu permukaan dengan sel terbagi, bukan kumpulan kartu terpisah. Sparkline muncul hanya bila ada dua titik data atau lebih.</p>
      <PulseStatGrid label="Contoh strip statistik"><PulseStat label="Penyebutan" value={535} delta={12.4} trend={sampleTrend} note="vs periode sebelumnya"/><PulseStat label="Interaksi" value={48210} note="412 posting memiliki metrik"/><PulseStat label="Positif" tone="positive" value={128} trend={[2,5,4,9,12,10,14]} note="26% dari posting berlabel" onClick={()=>{}}/><PulseStat label="Negatif" tone="negative" value={64} trend={[1,1,3,2,6,9,7]} note="13% dari posting berlabel" onClick={()=>{}}/><PulseStat label="Share" value={null} note="Tidak tersedia dari sumber"/></PulseStatGrid>
    </section>
    <section aria-label="Kartu analitik"><h3>Kartu analitik</h3><p>Judul, deskripsi, tindakan di kanan, isi, lalu catatan metodologi. Distribusi dan peringkat memakai baris yang dapat diklik menuju bukti.</p>
      <div className="pu-gallery-pair">
        <AnalyticsPanel title="Sentimen" description="Bagian dari keseluruhan" actions={<PulseTag size="sm">Contoh</PulseTag>} footer="Catatan metodologi berada di kaki kartu.">
          <PulseDistribution total={sentimentTotal} segments={sentimentOrder.map(key=>({key,label:sentimentLabels[key],value:sampleSentiment[key],color:sentimentColor[key],hatch:key==='unknown'}))}/>
        </AnalyticsPanel>
        <AnalyticsPanel title="Sumber percakapan" description="Peringkat dengan porsi">
          <PulseBreakdown rows={samplePlatforms.map(([key,value])=>({key,label:platformLabel(key),value,color:platformColor(key),leading:<PlatformIcon platform={key} size={16}/>}))}/>
        </AnalyticsPanel>
      </div>
      <PulseLegend items={sentimentOrder.map(key=>({key,label:sentimentLabels[key],color:sentimentColor[key],hatch:key==='unknown'}))}/>
      <PulsePanelEmpty title="Belum ada data pada periode ini">Keadaan kosong menjelaskan apa yang belum tersedia dan langkah berikutnya, tanpa angka pengganti.</PulsePanelEmpty>
    </section>
    <section><h3>Pilihan platform</h3><PlatformCheckboxes platforms={['youtube','x','news','tiktok','instagram']} value={platforms} onChange={setPlatforms}/></section>
    <section><h3>Metrik teramati</h3><dl className="pu-gallery-metrics"><PulseMetric label="Suka" value={120} icon={PulseLike}/><PulseMetric label="Komentar" value={0} icon={PulseComment}/><PulseMetric label="Bagikan" value={null} icon={PulseShare}/><PulseMetric label="Tayangan" value={2400} icon={PulseView}/></dl><div className="pu-example-row">{[['Suka',PulseLike],['Komentar',PulseComment],['Bagikan',PulseShare],['Tayangan',PulseView],['Interaksi',PulseBeat]].map(([name,icon])=><span key={name} className="pu-mark-specimen">{createElement(icon,{size:28})}<small>{name}</small></span>)}</div><p>Ikon metrik PULSE: tiap tanda interaksi membawa satu denyut. Tayangan adalah paparan, jadi tanpa denyut.</p><PulseEngagement label="Contoh rincian interaksi" metrics={{likes:1830,comments:412,shares:268,views:48200}}/><p>Nol adalah angka teramati. Data yang tidak tersedia tidak boleh diganti nol.</p></section>
  </section>;
}
