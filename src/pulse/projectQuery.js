const splitTerms = value => [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))];

export function buildProjectQuery(main, required = '', excluded = '', variations = '') {
  const terms = value => splitTerms(value).map(term => {
    if (/["\\()\r\n]/.test(term)) throw new Error('Gunakan kata atau frasa tanpa tanda kutip, kurung, atau baris baru.');
    return `"${term}"`;
  });
  if (!terms(main).length) throw new Error('Isi minimal satu keyword utama.');
  const alternatives = terms([main, variations].join(','));
  const query = (alternatives.length > 1 ? `(${alternatives.join(' OR ')})` : alternatives[0]) + terms(required).map(s => ` AND ${s}`).join('') + terms(excluded).map(s => ` NOT ${s}`).join('');
  if (query.length > 250) throw new Error('Query maksimal 250 karakter untuk pengumpulan Xpoz.');
  return query;
}

export function explainProjectQuery(main, required = '', excluded = '', variations = '') {
  const list = value => splitTerms(value).map(term => `“${term}”`).join(', ');
  return `Cocok dengan salah satu: ${list([main, variations].join(','))}. `
    + (splitTerms(required).length ? `Wajib memuat semua: ${list(required)}. ` : 'Tanpa konteks wajib. ')
    + (splitTerms(excluded).length ? `Abaikan jika memuat salah satu: ${list(excluded)}.` : 'Tanpa pengecualian.');
}
export function projectSearch(search, id) {
  const next = new URLSearchParams(search);
  if (id) next.set('topic', id); else next.delete('topic');
  next.delete('alert');
  next.delete('q');
  return next.toString();
}

export function quickSearchDestination(pathname, search) {
  const params = new URLSearchParams(search);
  const query = params.get('q')?.trim();
  return pathname === '/pulse/posts' && !params.get('topic') && query
    ? '/pulse/search?' + new URLSearchParams({q:query}) : null;
}

// Only decode syntax produced by the builder. Never reinterpret arbitrary Boolean queries.
export function parseProjectQuery(query) {
  if (!query) return {main:'',required:'',excluded:''};
  const main = [], required = [], excluded = [];
  const matches = [...query.matchAll(/(AND |NOT )?"([^"\n]+)"/g)];
  for (const match of matches) (match[1] === 'AND ' ? required : match[1] === 'NOT ' ? excluded : main).push(match[2]);
  const fields = {main:main.join(', '),required:required.join(', '),excluded:excluded.join(', ')};
  try { return buildProjectQuery(fields.main,fields.required,fields.excluded) === query ? fields : null; }
  catch { return null; }
}
