import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { PulseButton } from '../components/ui/PulseUI';
import { PlatformIcon, platformLabel } from '../components/admin/pulse/PlatformIcon';
import { formatCount } from '../lib/pulseData';
import { WARMUP_SECONDS, warmupRows, warmupSummary, warmupText } from './warmupState.js';

/** The first minutes of a new project. Every chosen source is asked for everything it has for the project's range of
 * days; this screen shows how far each one is and opens the project when all have settled or about three minutes have
 * passed, whichever comes first. Collection then goes on in the background and by each source's schedule.
 * `onOpen` is called once. `pollMs` is how often the progress is read. */
export default function ProjectWarmup({ topic, platforms, onOpen, pollMs = 4000 }) {
  const [progress, setProgress] = useState(null);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const opened = useRef(false);
  useEffect(() => {
    let active = true;
    const read = () => api.get('/admin/pulse/topics/' + encodeURIComponent(topic.id) + '/lookback').then(state => {
      if (!active) return;
      setProgress(state.progress || null);
      if (state.progress?.finished) setFinished(true);
    }).catch(() => { /* a missed reading changes nothing: the clock still opens the project */ });
    read();
    const poll = setInterval(read, pollMs), clock = setInterval(() => setElapsed(value => value + 1), 1000);
    return () => { active = false; clearInterval(poll); clearInterval(clock); };
  }, [topic.id, pollMs]);
  const rows = warmupRows(platforms, progress), summary = warmupSummary(rows, elapsed, finished);
  const open = () => { if (!opened.current) { opened.current = true; onOpen(); } };
  useEffect(() => { if (summary.ready) open(); });
  return <section className="pwu" aria-label="Pengumpulan awal project">
    <header><h2>Mengumpulkan percakapan untuk “{topic.label}”</h2></header>
    <div className="pwu-time" role="progressbar" aria-label="Waktu pengumpulan awal" aria-valuemin={0} aria-valuemax={WARMUP_SECONDS} aria-valuenow={Math.min(elapsed, WARMUP_SECONDS)} aria-valuetext={`${summary.clock} dari sekitar 3 menit`}><i style={{ transform: `scaleX(${summary.share})` }} /></div>
    <p className="pwu-clock" role="status"><b>{summary.clock}</b> dari sekitar 3 menit<span>{formatCount(summary.posts)} posting diterima</span><span>{summary.settled} dari {summary.total} sumber selesai</span></p>
    <ul className="pwu-rows">{rows.map(row => <li key={row.platform} data-state={row.state}>
      <span className="pwu-source"><PlatformIcon platform={row.platform} size={18} />{platformLabel(row.platform)}</span>
      <span className="pwu-state">{warmupText(row, formatCount)}</span>
    </li>)}</ul>
    <footer>
      <PulseButton onClick={open}>Buka sekarang</PulseButton></footer>
  </section>;
}
