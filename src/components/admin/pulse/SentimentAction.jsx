import {Sparkles,Plus,Minus,Equal,Smile,Angry,Frown,Ghost,Annoyed,Heart,HelpCircle} from 'lucide-react';
import { postSentiment, sentimentLabels } from '../../../lib/pulsePostFilters';
import {postEmotion,emotionLabels} from '../../../lib/pulseEmotion';
import './post-ai-analysis.css';

const sentimentIcons={positive:Plus,negative:Minus,neutral:Equal};
const emotionIcons={joy:Smile,anger:Angry,sadness:Frown,fear:Ghost,disgust:Annoyed,admiration:Heart,none:HelpCircle};

export default function SentimentAction({ post }) {
  const label = postSentiment(post);
  const emotion=postEmotion(post),SentimentIcon=sentimentIcons[label],EmotionIcon=emotion?emotionIcons[emotion.label]:null;
  return <section className="pulse-post-ai" aria-label="AI Analysis">
    <div className="pulse-post-ai-brand"><span className="pulse-post-ai-mark"><Sparkles size={18} aria-hidden="true"/></span><strong>AI Analysis</strong></div>
    <div className="pulse-post-ai-tags">
      {SentimentIcon?<span className={'pulse-ai-tag '+label} aria-label={'Sentimen: '+sentimentLabels[label]}><SentimentIcon size={14} aria-hidden="true"/>{sentimentLabels[label]}</span>:<span className="pulse-post-ai-pending">Analisa belum tersedia.</span>}
      {emotion&&<span className={'pulse-ai-tag emotion-'+emotion.label} aria-label={'Emosi: '+emotionLabels[emotion.label]}><EmotionIcon size={16} aria-hidden="true"/>{emotionLabels[emotion.label]}{(emotion.review_needed||emotion.confidence<.7)&&<small>· Perlu ditinjau</small>}</span>}
    </div>
  </section>;
}
