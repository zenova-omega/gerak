import { replayTime } from './pulseReplay.js';

// Account IDs come only from the existing network; never join authors by name.
export function chronologyRows(frame, { kind = 'all', includeIsolated = true } = {}) {
  const linked = new Set((frame.edges || [])
    .filter(edge => kind === 'all' || edge.kind === kind)
    .flatMap(edge => [edge.source, edge.target]));
  const seen = new Map();
  for (const account of frame.accounts || []) {
    if (!includeIsolated && !linked.has(account.id)) continue;
    for (const post of account.evidence || []) {
      if (!seen.has(post.id)) seen.set(post.id, {
        ...post, accountId: account.id, time: replayTime(post.published_at),
      });
    }
  }
  return [...seen.values()].sort((a, b) =>
    (a.time ?? Infinity) - (b.time ?? Infinity) || String(a.id).localeCompare(String(b.id)));
}

export function chronologyPage(rows, requestedPage = 0) {
  const pages = Math.max(1, Math.ceil(rows.length / 15));
  const page = Math.max(0, Math.min(pages - 1, Math.trunc(requestedPage) || 0));
  const unknown = rows.filter(row => row.time === null).length;
  return { rows: rows.slice(page * 15, page * 15 + 15), page, pages,
    total: rows.length, dated: rows.length - unknown, unknown };
}

export function observedProfile(node, account) {
  const rows = chronologyRows({ accounts: account?.id === node?.id ? [account] : [] });
  const dated = rows.filter(row => row.time !== null);
  return {
    label: node?.label || 'Tidak tersedia', platform: node?.platform || 'Tidak tersedia',
    status: rows.length ? 'Posting teramati' : 'Hanya disebut', count: rows.length,
    first: dated[0]?.published_at ?? null, last: dated.at(-1)?.published_at ?? null,
    unknown: rows.length - dated.length,
    bio: 'Tidak tersedia dalam data saat ini', demography: 'Tidak diketahui; tidak disimpulkan',
  };
}

/** What the order does and does not show. Read on demand from the info mark beside the title. */
export const chronologyNotes = [
  'Urutan publikasi dari bukti yang tersedia, bukan rantai repost. Urutan waktu bukan bukti sebab-akibat; asal sebenarnya belum diketahui.',
  '“Terawal teramati” berarti publikasi bertanggal paling awal dalam sampel yang dimuat, bukan waktu ditemukan atau pencetus asli. Waktu yang sama dapat dimiliki beberapa posting.',
  'Filter hubungan membatasi akun bila “Akun tanpa hubungan” dimatikan.',
];
