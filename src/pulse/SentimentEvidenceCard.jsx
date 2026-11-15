import { PulseArrow } from '../components/ui/PulseArrow';
import {Link} from 'react-router-dom';
import {ExternalLink} from 'lucide-react';
import {PulseSourceHeading} from '../components/ui/PulsePatterns';
import PostCaption from '../components/admin/pulse/PostCaption';
import {safeSourceUrl} from '../lib/pulseData';
import {sourceText} from '../lib/pulseOverview';
import './sentiment-evidence.css';
import {PreviewImage} from '../components/admin/pulse/PostMediaPreview';
import {postMedia,safeMediaUrl} from '../lib/pulseMedia';
import {postEmotion,emotionLabels,emotionFaces} from '../lib/pulseEmotion';
import {PulseMetricRow} from '../components/ui/PulseMetricRow';
import {PulseTag,SentimentTag} from '../components/ui/PulseTag';
import {kindHints,kindLabels,neutralKind} from '../lib/pulseVoice';
import InfoTip from './InfoTip';
import AnalysisPending from './AnalysisPending';

/** One post as evidence for a sentiment reading. Compact by design: who, what was written, how it was
 * read and why, then the numbers on one line. A source without metrics (news) shows no metric row.
 * In a list on a wide panel the reading and the numbers sit in a column beside the caption; `compact` is the grid card. */
export default function SentimentEvidenceCard({post,selectedLabel,accountLink,compact=false}){
 const kind=selectedLabel==='neutral'?neutralKind(post):null;   // what a neutral post is: a report, a question, a call, sarcasm
 const result=post.metrics?.sentiment,url=safeSourceUrl(post.url);
 const emotion=postEmotion(post);
 const media=postMedia(post);
 const image=media.imageUrl||safeMediaUrl(post.metrics?.thumbnail_url)||safeMediaUrl(post.metrics?.media_url);
 const hasMedia=Boolean(image||media.videoUrl||media.embedUrl);
 const reason=result?.reason||(selectedLabel==='unknown'?'Belum tersedia. Menunggu analisis otomatis.':'Sumber label tidak menyertakan alasan.');
 const cut=compact?110:160;   // a grid card is a third as wide, so it shows less before the full text is offered
 const shortReason=reason.length>cut?reason.slice(0,cut).replace(/\s+\S*$/,'')+'…':reason;
 const review=result?.review_needed||typeof result?.confidence==='number'&&result.confidence<.7;
 return <li className="pse-card">
  <PulseSourceHeading post={post}>
   <SentimentTag value={selectedLabel}/>{kind&&kind!=='unsorted'&&<PulseTag variant="outline" title={kindHints[kind]}>{kindLabels[kind]}</PulseTag>}
   {emotion&&<PulseTag variant="outline" title={emotion.reason} aria-label={'Emosi: '+emotionLabels[emotion.label]}><span aria-hidden="true">{emotionFaces[emotion.label]}</span> {emotionLabels[emotion.label]}</PulseTag>}
   {url&&<a href={url} target="_blank" rel="noopener noreferrer" aria-label={'Buka posting asli '+(post.author||'')}><ExternalLink size={16} aria-hidden="true"/></a>}
  </PulseSourceHeading>
  <div className={'pse-story'+(hasMedia?' has-media':'')}>
   {hasMedia&&<div className="pse-thumbnail"><PreviewImage media={{...media,imageUrl:image}} author={post.author}/></div>}
   <div className="pse-content"><PostCaption limit={compact?200:420} post={{...post,text:sourceText(post)}}/></div>
  </div>
  {selectedLabel==='unknown'?<AnalysisPending post={post}/>:<section className="pse-reading" aria-label="Analisis sentimen posting"><strong>Kenapa dinilai begitu</strong><p>{shortReason}{reason.length>cut&&<InfoTip label="Lihat alasan lengkap">{reason}</InfoTip>}</p>{review&&<PulseTag tone="warning" dot size="sm">Perlu ditinjau</PulseTag>}</section>}
  <footer className="pse-foot"><PulseMetricRow metrics={post.metrics} platform={post.platform} hideEmpty label="Rincian interaksi posting"/><Link to={accountLink}>Posting akun ini <PulseArrow decorative size={14}/></Link></footer>
 </li>;
}
