import { useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { PulseButton } from '../components/ui/PulseUI';

export default function WorkspaceNavigation({ brand, label, children }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  function closeOnEscape(event) {
    if (event.key !== 'Escape' || !open) return;
    setOpen(false);
    toggle.current?.focus();
  }
  return <aside className="ps-sidebar" data-menu-open={open} onKeyDown={closeOnEscape}>
    <div className="ps-sidebar-heading">
      {brand}
      <PulseButton ref={toggle} className="ps-menu-toggle" aria-expanded={open} aria-controls="ps-navigation-body" onClick={() => setOpen(value => !value)}>
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        <span>{open ? 'Tutup menu' : label}</span>
      </PulseButton>
    </div>
    <div className="ps-navigation-body" id="ps-navigation-body">
      <p className="ps-workspace-label">Ruang kerja</p>
      {children}
    </div>
  </aside>;
}
