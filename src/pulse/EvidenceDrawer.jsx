import * as Dialog from '@radix-ui/react-dialog';
import {useRef} from 'react';
import {X} from 'lucide-react';
import './evidence-drawer.css';

export default function EvidenceDrawer({open,onClose,title,description,children}){
 const returnFocus=useRef(null);
 return <Dialog.Root open={open} onOpenChange={value=>{if(!value)onClose();}}><Dialog.Portal container={typeof document==='undefined'?undefined:document.querySelector('.pulse-standalone')}>
  <Dialog.Overlay className="ped-overlay"/>
  <Dialog.Content className="ped-panel" onOpenAutoFocus={()=>{returnFocus.current=document.activeElement;}} onCloseAutoFocus={event=>{event.preventDefault();if(returnFocus.current?.isConnected)returnFocus.current.focus();}}><header><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><Dialog.Close className="ped-close" aria-label="Tutup detail posting"><X size={20} aria-hidden="true"/><span>Tutup</span></Dialog.Close></header><div className="ped-body">{children}</div></Dialog.Content>
 </Dialog.Portal></Dialog.Root>;
}
