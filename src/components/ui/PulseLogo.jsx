/** PULSE identity marks. One stroke weight, drawn on a 130-unit x-height.
 * The "l" and "s" are a single line: a tall spike that settles into a wave, the pulse trace
 * the product is named for. Colour comes from `currentColor`; never recolour letters separately. */
const TRACE = 'M325 -40V120A25 25 0 0 0 350 145H420A25 25 0 0 0 420 95H385A25 25 0 0 1 385 45H452';

/** Full wordmark. Set the size with `height` (px); width follows the 590:290 artboard. */
export function PulseLogo({ height = 28, title = 'PULSE', className = '' }) {
  return <svg className={`pu-logo ${className}`.trim()} viewBox="15 -58 592 296" height={height} width={height * 2} role="img" aria-label={title} fill="none" stroke="currentColor" strokeWidth="36" strokeLinejoin="round" focusable="false">
    <path d="M40 30V220" /><circle cx="90" cy="95" r="50" />
    <path d="M185 30V105A40 40 0 0 0 265 105V30M265 30V160" />
    <path d={TRACE} />
    <path d="M480 95H580A50 50 0 1 0 565.4 130.4" />
  </svg>;
}

/** Compact symbol: the spike-and-wave trace alone, for the app tile, favicon and tight spaces. */
export function PulseSymbol({ size = 36, title, className = '' }) {
  return <svg className={`pu-symbol ${className}`.trim()} viewBox="0 0 240 240" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} fill="none" stroke="currentColor" strokeWidth="36" strokeLinejoin="round" focusable="false">
    <path transform="translate(-268 70)" d={TRACE} />
  </svg>;
}
