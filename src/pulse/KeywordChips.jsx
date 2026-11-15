import { useId } from 'react';
import InfoTip from './InfoTip';

export default function KeywordChips({label,value,onChange,help,placeholder}) {
  const id = useId();
  const terms = [...new Set(value.split(',').map(s=>s.trim()).filter(Boolean))];
  return <div className="ps-keyword-input"><label htmlFor={id}>{label}</label>{help && <InfoTip label={'Tentang '+label}>{help}</InfoTip>}
    <input id={id} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    <div className="ps-keyword-chips">{terms.map(term=><button key={term} type="button" onClick={()=>onChange(terms.filter(t=>t!==term).join(', '))} aria-label={'Hapus keyword '+term}>{term}<span aria-hidden="true"> ×</span></button>)}</div>
  </div>;
}
