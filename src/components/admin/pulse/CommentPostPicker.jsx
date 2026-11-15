import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, Search } from 'lucide-react';
import AccountAvatar from './AccountAvatar';
import { platformLabel } from './PlatformIcon';
import { PlatformTag, PulseTag } from '../../ui/PulseTag';
import { PulseButton } from '../../ui/PulseUI';
import { PulseComment } from '../../ui/PulseMetricIcons';
import { formatCount, pulseDate } from '../../../lib/pulseData';
import { commentPostPlatforms, matchParts, searchCommentPosts } from '../../../lib/pulseCommentPosts';

/** How many results are drawn at once. The busiest come first, so typing a word reaches the rest. */
const SHOWN = 200;

/** Text with the words the search matched marked. */
function Marked({ parts }) {
  return parts.map((part, index) => part.hit ? <mark key={index}>{part.text}</mark> : part.text);
}

/** Picks the post whose comments are read, or all of them. A button that shows the choice opens a panel with a
 * search box (caption and account name), platform chips and the posts, busiest first. The search box is a
 * combobox over the list: arrow keys move, Enter chooses, Escape closes and gives focus back to the button.
 * Tab goes on to the chips and then to the list, which takes the same keys.
 * @param {{rows: ReturnType<typeof import('../../../lib/pulseCommentPosts').commentPostRows>, value: string, onChange: (id: string) => void, buttonId?: string}} props
 * `value` is a post id or 'all'. `buttonId` names the button, for a caller that wants to hand focus back to it. */
export default function CommentPostPicker({ rows = [], value = 'all', onChange, buttonId }) {
  const id = useId();
  const labelId = id + 'label', valueId = id + 'value', panelId = id + 'panel', listId = id + 'list';
  const root = useRef(null), trigger = useRef(null), input = useRef(null), list = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [activeId, setActiveId] = useState(value);
  const [byKey, setByKey] = useState(true);   // the ring is drawn for the keyboard, a tint alone for the pointer

  const chosen = rows.find(row => row.id === value) || null;
  const totalComments = rows.reduce((sum, row) => sum + row.comments, 0);
  // Matching a few hundred rows is cheap enough to do on every keystroke.
  const found = searchCommentPosts(rows, { query });
  const results = searchCommentPosts(found, { platforms });
  const chips = commentPostPlatforms(rows, found);   // counted before the platform choice, so a chip says what it would add
  const shown = results.slice(0, SHOWN);
  const options = ['all', ...shown.map(row => row.id)];
  const active = Math.max(0, options.indexOf(activeId));
  const filtered = query.trim() !== '' || platforms.length > 0;
  const optionId = index => `${listId}-${index}`;
  const mark = index => active === index ? (byKey ? 'key' : 'pointer') : undefined;
  const point = next => { setByKey(false); setActiveId(next); };

  // Opening puts the cursor in the search box, with any earlier search selected so typing replaces it.
  useEffect(() => { if (open) { input.current?.focus(); input.current?.select(); } }, [open]);
  // A press outside closes the panel without moving focus.
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  // The option the keyboard is on stays inside the scrolling list.
  useEffect(() => {
    const box = list.current, item = open && box?.querySelector('[data-active]');
    if (!item) return;
    const top = item.offsetTop, bottom = top + item.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }, [open, active, shown.length]);

  function show() {
    setByKey(true);
    setActiveId(options.includes(value) ? value : filtered && shown[0] ? shown[0].id : 'all');
    setOpen(true);
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function choose(next) {
    onChange(next);
    close();
  }
  /** A new search or platform choice: the keyboard starts on the first result, since that is what Enter should take. */
  function narrow(nextQuery, nextPlatforms) {
    setQuery(nextQuery);
    setPlatforms(nextPlatforms);
    setByKey(true);
    const first = searchCommentPosts(rows, { query: nextQuery, platforms: nextPlatforms })[0];
    setActiveId((nextQuery.trim() || nextPlatforms.length) && first ? first.id : value);
  }
  function chip(next, event) {
    narrow(query, next);
    if (event.detail > 0) input.current?.focus();   // a mouse press goes back to typing; a keyboard press stays on the chip
  }
  /** Keys that work the list, from the search box and from the list itself (Tab reaches it after the chips).
   * Home, End and Space belong to the text while typing, so they act on the list only when focus is in it. */
  function listKeys(event, inList) {
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[event.key], last = options.length - 1;
    const go = index => { event.preventDefault(); setByKey(true); setActiveId(options[index]); };
    if (step) go(Math.abs(step) === 1 ? (active + step + options.length) % options.length : Math.max(0, Math.min(last, active + step)));
    else if (inList && event.key === 'Home') go(0);
    else if (inList && event.key === 'End') go(last);
    else if (event.key === 'Enter' || (inList && event.key === ' ')) { event.preventDefault(); choose(options[active]); }
  }

  const postName = row => row.author || 'Tanpa nama';
  return <div className="cpp" ref={root} data-open={open ? '' : undefined}
    onKeyDown={event => { if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}
    onBlur={event => { if (open && event.relatedTarget && !root.current?.contains(event.relatedTarget)) setOpen(false); }}>
    <span className="cpp-label" id={labelId}>Posting</span>
    <button type="button" className="cpp-trigger" id={buttonId} ref={trigger} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} aria-labelledby={`${labelId} ${valueId}`}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (open) input.current?.focus(); else show(); } }}>
      {chosen ? <AccountAvatar size="xs" author={chosen.author} platform={chosen.platform} /> : <Search className="cpp-trigger-icon" size={16} aria-hidden="true" />}
      <span className="cpp-value" id={valueId}>{chosen
        ? <><strong>{postName(chosen)}</strong><span>{chosen.caption || 'Tanpa teks'}</span></>
        : <><strong>Semua posting</strong><span>{formatCount(rows.length)} posting</span></>}</span>
      <ChevronDown className="cpp-caret" size={16} aria-hidden="true" />
    </button>
    {open && <div className="cpp-panel" id={panelId} role="dialog" aria-label="Pilih posting">
      <div className="pu-search cpp-search">
        <Search aria-hidden="true" />
        <input ref={input} type="search" role="combobox" aria-label="Cari posting menurut caption atau nama akun" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={optionId(active)}
          autoComplete="off" spellCheck={false} enterKeyHint="search" placeholder="Cari caption atau nama akun" value={query} onChange={event => narrow(event.target.value, platforms)} onKeyDown={event => listKeys(event, false)} />
      </div>
      {chips.length > 1 && <div className="pu-tag-group cpp-chips" role="group" aria-label="Filter platform">
        <PulseTag tone="accent" pressed={!platforms.length} onClick={event => chip([], event)}>Semua</PulseTag>
        {chips.map(({ platform, posts }) => <PlatformTag key={platform} platform={platform} count={formatCount(posts)} pressed={platforms.includes(platform)} disabled={!posts && !platforms.includes(platform)} aria-label={`${platformLabel(platform)}, ${formatCount(posts)} posting`}
          onClick={event => chip(platforms.includes(platform) ? platforms.filter(key => key !== platform) : [...platforms, platform], event)} />)}
      </div>}
      <p className="cpp-status" role="status">{!results.length ? 'Tidak ada posting yang cocok.' : filtered ? `${formatCount(results.length)} dari ${formatCount(rows.length)} posting cocok` : `${formatCount(rows.length)} posting berkomentar`}{results.length > SHOWN && <>, {formatCount(SHOWN)} teratas ditampilkan</>}</p>
      {/* Pressing an option must not take focus from the search box. */}
      <ul className="cpp-list" id={listId} ref={list} role="listbox" aria-label="Posting yang punya komentar" tabIndex={0} aria-activedescendant={optionId(active)}
        onMouseDown={event => event.preventDefault()} onFocus={() => setByKey(true)} onKeyDown={event => listKeys(event, true)}>
        <li className="cpp-option" id={optionId(0)} role="option" aria-selected={value === 'all' || !chosen} data-active={mark(0)}
          aria-label={`Semua posting: ${formatCount(rows.length)} posting, ${formatCount(totalComments)} komentar`} onClick={() => choose('all')} onPointerMove={() => point('all')}>
          <span className="cpp-all" aria-hidden="true"><Layers size={16} /></span>
          <span className="cpp-option-text"><span className="cpp-option-who"><strong>Semua posting</strong></span><span className="cpp-option-caption">Komentar dari {formatCount(rows.length)} posting sekaligus</span></span>
          <span className="cpp-option-count"><PulseComment size={14} />{formatCount(totalComments)}</span>
          <Check className="cpp-check" size={16} aria-hidden="true" />
        </li>
        {shown.map((row, index) => <li key={row.id} className="cpp-option" id={optionId(index + 1)} role="option" aria-selected={row.id === value} data-active={mark(index + 1)}
          aria-label={`${postName(row)}, ${platformLabel(row.platform)}, ${pulseDate(row.published_at)}. ${row.caption.slice(0, 160) || 'Tanpa teks'}. ${formatCount(row.comments)} komentar`}
          onClick={() => choose(row.id)} onPointerMove={() => point(row.id)}>
          <AccountAvatar size="sm" author={row.author} platform={row.platform} />
          <span className="cpp-option-text">
            <span className="cpp-option-who"><strong><Marked parts={matchParts(postName(row), row.author ? query : '')} /></strong><small>{platformLabel(row.platform)} · {pulseDate(row.published_at)}</small></span>
            <span className="cpp-option-caption">{row.caption ? <Marked parts={matchParts(row.caption, query, { max: 140, lead: 16 })} /> : 'Tanpa teks'}</span>
          </span>
          <span className="cpp-option-count"><PulseComment size={14} />{formatCount(row.comments)}</span>
          <Check className="cpp-check" size={16} aria-hidden="true" />
        </li>)}
      </ul>
      {!results.length && <div className="cpp-empty"><p>Coba kata lain.</p><PulseButton size="sm" onClick={() => { narrow('', []); input.current?.focus(); }}>Hapus pencarian</PulseButton></div>}
    </div>}
  </div>;
}
