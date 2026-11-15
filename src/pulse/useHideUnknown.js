import { useEffect, useState } from 'react';

const KEY = 'pulse-hide-unanalysed', EVENT = 'pulse-hide-unanalysed';
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

/** One preference for every chart that has a "Belum dianalisis" series: show or hide its rows and segment. It never changes
 * a percentage: a tone's share is always of the analysed posts (tone_share_v1, `toneShares` in pulseMeasures.js). */
export default function useHideUnknown() {
  const [hidden, setHidden] = useState(read);
  useEffect(() => {
    const sync = () => setHidden(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const set = value => { try { localStorage.setItem(KEY, value ? '1' : '0'); } catch { /* preference stays for this view only */ } setHidden(value); window.dispatchEvent(new Event(EVENT)); };
  return [hidden, set];
}
