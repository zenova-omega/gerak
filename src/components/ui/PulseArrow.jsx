/** PULSE's own "open the evidence" mark: a diagonal arrow whose shaft carries one heartbeat.
 * Use it wherever a control leaves the summary for the source or a deeper view.
 * The hidden glyph keeps the accessible name identical to the old text arrow;
 * pass `decorative` when the control already has a complete label. */
export function PulseArrow({ size = '1em', className = '', decorative = false }) {
  return <span className={`pu-arrow ${className}`.trim()}>
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 13 6.2 9.8 8.1 9.7 7 6.2 9.4 6.6 13 3" /><path d="M8.2 3H13v4.8" />
    </svg>{!decorative && <span className="pu-sr">↗</span>}
  </span>;
}
export default PulseArrow;
