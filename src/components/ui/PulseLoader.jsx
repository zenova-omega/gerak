import './pulse-patterns.css';

/** The PULSE waiting mark: a dot that beats like a pulse, with two rings leaving it on each beat.
 * Use where the reader waits for an answer (session check, AI writing). Page content that is loading
 * uses PulseSkeleton instead. With reduced motion it is a still dot.
 * @param {{label: string, size?: 'sm'|'md'|'lg', inline?: boolean}} props */
export function PulseLoader({ label, size = 'md', inline = false }) {
  return <span className="pu-loader" data-size={size} data-inline={inline ? '' : undefined} role="status">
    <span className="pu-loader-mark" aria-hidden="true"><i /><i /><b /></span>
    <span className="pu-loader-label">{label}</span>
  </span>;
}
