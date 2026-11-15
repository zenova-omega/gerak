import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { PulseButton, PulseNotice } from '../components/ui/PulseUI';
import PostFeed from '../components/admin/pulse/PostFeed';

export default function QuickSearch() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [state, setState] = useState({});
  useEffect(() => {
    if (query.trim().length < 2) return;
    let active = true;
    api.get('/admin/pulse/search', { q: query }).then(data => {
      if (active) setState({ query, data });
    }).catch(error => { if (active) setState({ query, error: error.status ? error.message : 'Tidak terhubung.' }); });
    return () => { active = false; };
  }, [query]);
  const pending = query.length >= 2 && state.query !== query;
  return <section className="ps-quick-search">
    <h1>Pencarian cepat</h1>
    <form className="pm-mentions-search" onSubmit={event => {
      event.preventDefault();
      setParams({ q: new FormData(event.currentTarget).get('q').trim() });
    }}>
      <label htmlFor="pulse-global-query">Kata atau frasa<input key={query} id="pulse-global-query" name="q" type="search" defaultValue={query} minLength={2} maxLength={200} required placeholder="Contoh: penyadapan presiden" /></label>
      <PulseButton type="submit" variant="primary">Cari data tersimpan</PulseButton>
    </form>
    {pending && <p role="status">Mencari…</p>}
    {!pending && state.query === query && state.error && <PulseNotice tone="warning" role="alert">{state.error} <PulseButton onClick={() => window.location.reload()}>Coba lagi</PulseButton></PulseNotice>}
    {!pending && state.query === query && state.data && <>
      <p role="status">{state.data.posts.length} posting unik ditemukan{state.data.truncated ? ' (500 terbaru).' : '.'}</p>
      <PostFeed key={query} posts={state.data.posts} />
    </>}
  </section>;
}
