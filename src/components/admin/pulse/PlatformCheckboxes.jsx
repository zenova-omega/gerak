import { PlatformLabel } from './PlatformIcon';
import { PulseButton } from '../../ui/PulseUI';
import './platform-checkboxes.css';

export default function PlatformCheckboxes({ platforms, value, onChange, counts = {} }) {
  const selected = value ?? platforms;
  function toggle(platform) {
    const next = selected.includes(platform) ? selected.filter(p => p !== platform) : [...selected, platform];
    onChange(platforms.every(p => next.includes(p)) ? null : next);
  }
  return <fieldset className="pulse-platform-picker">
    <legend>Platform</legend>
    <div className="pp-actions"><PulseButton variant="quiet" onClick={() => onChange(null)}>Pilih semua</PulseButton><PulseButton variant="quiet" onClick={() => onChange([])}>Kosongkan</PulseButton></div>
    <div className="pp-options">{platforms.map(platform => <label key={platform}>
      <input type="checkbox" checked={selected.includes(platform)} onChange={() => toggle(platform)} />
      <PlatformLabel platform={platform} />
      {counts[platform] != null && <small aria-label={`${counts[platform]} posting`}>{counts[platform]}</small>}
    </label>)}</div>
  </fieldset>;
}
