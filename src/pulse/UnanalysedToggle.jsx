/** The switch that goes in a chart panel's top-right corner. `noun` names what is counted (posting, komentar). */
export function UnanalysedToggle({ hidden, onChange, count, noun = 'posting' }) {
  return <label className="pu-switch" title={`Sembunyikan ${noun} yang belum dianalisis dan hitung persentase dari yang sudah dianalisis saja`}>
    <input type="checkbox" role="switch" checked={hidden} onChange={event => onChange(event.target.checked)} />
    <span className="pu-switch-track" aria-hidden="true"><i /></span>
    <span>Hanya yang sudah dianalisis{count > 0 && !hidden ? ` (${count.toLocaleString('id-ID')} belum)` : ''}</span>
  </label>;
}
