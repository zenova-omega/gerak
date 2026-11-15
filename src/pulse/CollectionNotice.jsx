import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { PulseNotice } from '../components/ui/PulseUI';
import { PulseArrow } from '../components/ui/PulseArrow';
import { collectionNotice } from './sourcesCoverage.js';

const EVERY_MS = 60000;

/** One line across every page when collection has stopped for a reason a person has to act on: the balance is empty,
 * or access was refused. It reads a stored status (no provider call), again on each page and once a minute, and
 * shows nothing at all while collection is fine. */
export default function CollectionNotice() {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let active = true;
    const read = () => api.get('/admin/pulse/sources/balance').then(value => { if (active) setStatus(value); }).catch(() => { /* A failed status read must not put a warning on screen. */ });
    read();
    const timer = setInterval(read, EVERY_MS);
    return () => { active = false; clearInterval(timer); };
  }, [location.pathname]);
  const notice = collectionNotice(status);
  if (!notice) return null;
  return <div className="ps-collection-notice"><PulseNotice tone="warning" role="status"><strong>{notice.title}</strong> {notice.text} <Link to={'/pulse/sources' + location.search}>Buka Sumber &amp; Cakupan <PulseArrow /></Link></PulseNotice></div>;
}
