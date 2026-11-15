// How the growth table words what the server measured. Nothing is calculated here: the hours, the rate and the
// change of pace come from the server; these helpers only say them.
import { pulseDate } from './pulseData.js';

/** "2 menit", "2 jam 3 menit", "2 hari 2 jam": the time between two observations. Null when there is none to state. */
export function elapsedText(hours) {
  if (typeof hours !== 'number' || !(hours > 0)) return null;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return 'kurang dari 1 menit';
  if (minutes < 60) return `${minutes} menit`;
  const whole = Math.floor(minutes / 60), rest = minutes % 60;
  if (whole < 48) return rest ? `${whole} jam ${rest} menit` : `${whole} jam`;
  const days = Math.floor(whole / 24), left = whole % 24;
  return left ? `${days} hari ${left} jam` : `${days} hari`;
}

/** The two observation times as one phrase: "15 Nov 2026, 05.09 → 07.12 WIB". The day is named once when both fall
 * on it and the zone once at the end. Each time is written by `pulseDate`, so it is the same clock as everywhere. */
export function observedWindow(from, to) {
  const first = pulseDate(from), last = pulseDate(to);
  const [dayA, timeA] = first.split(', '), [dayB, timeB] = last.split(', ');
  if (!timeA || !timeB) return `${first} → ${last}`;
  const zoneName = timeB.split(' ').slice(1).join(' ');
  const bare = zoneName && timeA.endsWith(' ' + zoneName) ? timeA.slice(0, -zoneName.length - 1) : timeA;
  return dayA === dayB ? `${dayA}, ${bare} → ${timeB}` : `${dayA}, ${bare} → ${dayB}, ${timeB}`;
}

/** The server's change of pace as one word. No value means two intervals were not available: that is not "steady". */
export function paceOf(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { key: 'unknown', label: 'Belum cukup data' };
  return value > 0 ? { key: 'up', label: 'Mempercepat' } : value < 0 ? { key: 'down', label: 'Melambat' } : { key: 'flat', label: 'Tetap' };
}
