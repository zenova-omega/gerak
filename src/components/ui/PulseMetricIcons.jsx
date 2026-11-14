// PULSE metric marks. Same hand as PulseArrow: 16px grid, 1.6 stroke, round joins,
// and one heartbeat inside each interaction mark. Views are exposure, so the eye has none.
function Mark({ size = 16, children, className = '' }) {
  return <svg className={`pu-mark ${className}`.trim()} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}
const beat = 'M4.4 7.7h1.5l.9-1.7 1.5 3.2.9-1.5h2.4';
export function PulseLike(props) {
  return <Mark {...props}><path d="M8 13.4C3.2 10 2 7.7 2 5.7a3 3 0 0 1 6-.9 3 3 0 0 1 6 .9c0 2-1.2 4.3-6 7.7Z" /><path d={beat} strokeWidth="1.2" /></Mark>;
}
export function PulseComment(props) {
  return <Mark {...props}><path d="M4.5 2.5h7a2 2 0 0 1 2 2v4.6a2 2 0 0 1-2 2H7.4l-3 2.4v-2.4a2 2 0 0 1-1.9-2V4.5a2 2 0 0 1 2-2Z" /><path d="M4.9 6.9h1.4l.8-1.5 1.4 2.9.8-1.4h1.8" strokeWidth="1.2" /></Mark>;
}
export function PulseShare(props) {
  return <Mark {...props}><path d="M6.8 4.5H4A1.5 1.5 0 0 0 2.5 6v6A1.5 1.5 0 0 0 4 13.5h6a1.5 1.5 0 0 0 1.5-1.5V9.4" /><path d="M6.6 9.4 8.4 7.6l1.3.1-.6-2.2 1.7.2 2.7-3.2" /><path d="M9.9 2.5h3.6v3.6" /></Mark>;
}
export function PulseView(props) {
  return <Mark {...props}><path d="M1.5 8S3.9 3.5 8 3.5 14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="1.9" /></Mark>;
}
export function PulseBeat(props) {
  return <Mark {...props}><path d="M1.5 8.6h3l1.4-4.2 2.9 8 1.5-3.8h4.2" /></Mark>;
}
