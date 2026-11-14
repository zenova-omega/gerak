import { PulseArrow } from '../components/ui/PulseArrow';
import {Link} from 'react-router-dom';
import {MessageSquareText,ExternalLink,Heart,Smile,Angry,Frown,Ghost,Annoyed,HelpCircle,Plus,Minus,Equal} from 'lucide-react';
import {PulseSourceHeading} from '../components/ui/PulsePatterns';
import PostCaption from '../components/admin/pulse/PostCaption';

import {safeSourceUrl} from '../lib/pulseData';
import {sourceText} from '../lib/pulseOverview';
import {sentimentLabels} from '../lib/pulsePostFilters';
import './sentiment-evidence.css';
import {PreviewImage} from '../components/admin/pulse/PostMediaPreview';
import {postMedia,safeMediaUrl} from '../lib/pulseMedia';
import {postEmotion,emotionLabels} from '../lib/pulseEmotion';
import {PulseEngagement} from '../components/ui/PulseEngagement';
import {SentimentTag} from '../components/ui/PulseTag';
import InfoTip from './InfoTip';
import AnalysisPending from './AnalysisPending';

const emotionIcons={joy:Smile,anger:Angry,sadness:Frown,fear:Ghost,disgust:Annoyed,admiration:Heart,none:HelpCircle};
const sentimentIcons={positive:Plus,negative:Minus,neutral:Equal,unknown:HelpCircle};

export default function SentimentEvidenceCard({post,selectedLabel,accountLink}){
 const result=post.metrics?.sentiment,url=safeSourceUrl(post.url);
 const emotion=postEmotion(post),EmotionIcon=emotion?emotionIcons[emotion.label]:null,SentimentIcon=sentimentIcons[selectedLabel]||HelpCircle;
 const media=postMedia(post);
 const image=media.imageUrl||safeMediaUrl(post.metrics?.thumbnail_url)||safeMediaUrl(post.metrics?.media_url);
 const hasMedia=Boolean(image||media.videoUrl||media.embedUrl);
 const reason=result?.reason||(selectedLabel==='unknown'?'Belum tersedia. Menunggu analisis otomatis.':'Sumber label tidak menyertakan alasan.');
 const shortReason=reason.length>160?reason.slice(0,160).replace(/\s+\S*$/,'')+'…':reason;
 return <li className="pse-card">
  <PulseSourceHeading post={post}><SentimentTag value={selectedLabel}/></PulseSourceHeading>
  <div className={'pse-story'+(hasMedia?' has-media':'')}>
   {hasMedia&&<div className="pse-thumbnail"><PreviewImage media={{...media,imageUrl:image}} author={post.author}/></div>}
   <div className="pse-content"><PostCaption post={{...post,text:sourceText(post)}}/></div>
  </div>
  <div className="pse-insights"><div className="pse-signals"><div className={'pse-signal '+selectedLabel}><span className="pse-signal-icon"><SentimentIcon aria-hidden="true"/></span><div><small>Sentimen teks</small><strong>{sentimentLabels[selectedLabel]}</strong></div></div>{emotion&&<div className={'pse-signal emotion-'+emotion.label}><span className="pse-signal-icon"><EmotionIcon aria-hidden="true"/></span><div><small>Emosi teks</small><strong aria-label={'Emosi: '+emotionLabels[emotion.label]}>{emotionLabels[emotion.label]}</strong></div><InfoTip label="Alasan emosi">{emotion.reason}{emotion.review_needed||emotion.confidence<.7?' Perlu ditinjau.':''}</InfoTip></div>}</div>
   {selectedLabel==='unknown'?<AnalysisPending post={post}/>:<section className="pse-analysis" aria-label="Analisis sentimen posting"><MessageSquareText size={16} aria-hidden="true"/><div><strong>Alasan AI {reason.length>160&&<InfoTip label="Lihat alasan lengkap">{reason}</InfoTip>}</strong><p>{shortReason}</p>{(result?.review_needed||typeof result?.confidence==='number'&&result.confidence<.7)&&<small>Perlu ditinjau</small>}</div></section>}
  </div>
  <div className="pse-interactions"><PulseEngagement metrics={post.metrics} platform={post.platform} compact label="Rincian interaksi posting"/></div>
  <footer className="pse-footer"><div><Link to={accountLink}>Posting akun <PulseArrow decorative size={14}/></Link>{url&&<a href={url} target="_blank" rel="noopener noreferrer">Posting asli <ExternalLink size={14} aria-hidden="true"/></a>}</div></footer>
 </li>;
}
