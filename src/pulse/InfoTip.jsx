import {useCallback,useState} from 'react';
import {Info} from 'lucide-react';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '../components/ui/shadcn/tooltip';
import './info-tip.css';

export default function InfoTip({label,children}){
 const [container,setContainer]=useState(null),[open,setOpen]=useState(false);
 const trigger=useCallback(node=>setContainer(node?.closest('.pulse-standalone')||null),[]);
 return <TooltipProvider delayDuration={200}><Tooltip open={open} onOpenChange={setOpen}>
  <TooltipTrigger asChild><button ref={trigger} type="button" className="ps-info-trigger" aria-label={label} onClick={()=>setOpen(true)}><Info size={16} aria-hidden="true"/></button></TooltipTrigger>
  <TooltipContent container={container} side="bottom" className="ps-info-content">{children}</TooltipContent>
 </Tooltip></TooltipProvider>;
}
