import { LogOut, Moon, Sun } from 'lucide-react';
import { PulseButton } from '../components/ui/PulseUI';

/** Up to two letters for the signed-in person: the first letter of the first two words of the name, else of the email. */
export function initialsOf(user) {
  const words = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
  const letters = words.length ? words.slice(0, 2).map(word => word[0]) : [String(user?.email || '?').trim()[0] || '?'];
  return letters.join('').toUpperCase();
}

/**
 * The sidebar's frozen bottom: one row with who is signed in (initials, name, role) and two icon buttons, the theme and
 * sign-out. Each button carries its action as its accessible name and a hover title. A sign-out that failed is announced
 * under the row.
 */
export default function SidebarAccount({ user, theme, onTheme, onLogout, busy = false, error = '' }) {
  const name = user.name || user.email, next = theme === 'dark' ? 'terang' : 'gelap';
  return <div className="ps-sidebar-bottom">
    <div className="ps-user">
      <span className="ps-user-mark" aria-hidden="true">{initialsOf(user)}</span>
      <span className="ps-user-text"><strong title={name}>{name}</strong><span className="ps-user-role">{user.role}</span></span>
      <PulseButton variant="quiet" iconOnly className="ps-user-action" onClick={onTheme} aria-label={`Gunakan tema ${next}`} title={`Tema ${next}`}>
        {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      </PulseButton>
      <PulseButton variant="quiet" iconOnly className="ps-user-action" onClick={onLogout} disabled={busy} aria-label={busy ? 'Keluar…' : 'Keluar'} title="Keluar">
        <LogOut size={18} aria-hidden="true" />
      </PulseButton>
    </div>
    {error && <p role="alert" className="ps-error">{error}</p>}
  </div>;
}
