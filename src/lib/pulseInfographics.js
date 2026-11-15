import { hasClock, validLocations } from './pulseData.js';
import { localTime, readTime } from './pulseMeasures.js';

export const STOPWORDS = new Set(('ada adalah adanya adapun agar akan akhirnya aku anda antara apa apabila apakah atas atau awal bagi bahwa bahkan baik banyak baru beberapa begitu belum benar berupa bisa bukan cara cukup dalam dan dapat dari daripada datang dengan demi demikian dia dilakukan diri dirinya dua dulu hanya harus hingga ia ialah ini itu jadi jangan juga justru kalau kami kamu karena kata ke kembali kemudian kepada ketika kita lagi lain lalu lebih maka makin maupun masih masing melalui memang mengenai menjadi mengatakan merupakan mereka meski mungkin namun nanti oleh pada paling para perlu pernah pula pun punya saat saja saling sama sampai sangat satu saya sebab sebagai sebagaimana sebagainya sebagian sebelum sebuah secara sedang sehingga sejak sejumlah sekitar selalu seluruh semua semakin sementara sendiri seperti serta setiap siapa sudah supaya telah tentang tentu terhadap tersebut tetapi tiap tidak tiga telah untuk yaitu yakni yang anda akan ini itu nya dong kok si sang rt via http https www com id the and for with from this that are was were not you your').split(/\s+/));

function uniquePosts(posts = []) {
  const seen = new Set();
  return posts.filter(post => {
    if (!post || typeof post !== 'object') return false;
    const key = post.id != null ? `id:${post.id}` : post.url ? `${post.platform || ''}:${post.url}` : post;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function plainText(value) {
  // Pure text preprocessing, never an HTML rendering/sanitization API. Decode
  // before removing markup so escaped RSS HTML cannot leak attribute tokens.
  const named = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
    ensp: ' ', emsp: ' ', thinsp: ' ', ndash: '–', mdash: '—', hellip: '…',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
  let text = value;
  for (let pass = 0; pass < 3; pass++) {
    text = text.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (_, entity) => {
      if (entity[0] !== '#') return named[entity.toLowerCase()] ?? ' ';
      const hex = entity[1].toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ' ';
    });
  }
  return text
    .replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
    .replace(/<(script|style)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
    .replace(/<\/?[a-z][\w:-]*\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi, ' ')
    .replace(/<![^>]*>/g, ' ');
}

/** The words of a post's title and text in reading order, as the word panel reads them: markup, links, addresses,
 * site names and @handles removed, lower-cased, letters only. Stop words and short words are still in.
 * server/app/services/pulse_readings.py reads text the same way; shared/pulse-readings.cases.json holds both to it. */
export function wordsIn(post) {
  const text = [post.title, post.text].filter(value => typeof value === 'string').map(plainText).join(' ')
    .normalize('NFKC').toLowerCase()
    .replace(/(?:https?:\/\/|www\.)\S+/gu, ' ')
    .replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+/gu, ' ')
    .replace(/\b[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+(?:\/\S*)?/gu, ' ')
    .replace(/@[\p{L}\p{N}_]+/gu, ' ');
  return text.match(/\p{L}+/gu) || [];
}
/** Whether the word panel counts a word: 3 to 40 characters and not a stop word. */
export const keepsWord = term => term.length >= 3 && term.length <= 40 && !STOPWORDS.has(term);

function termsIn(post) {
  return new Set(wordsIn(post).filter(keepsWord));
}

export function wordFrequency(posts = []) {
  const rows = uniquePosts(posts);
  const counts = new Map();
  let withText = 0;
  for (const post of rows) {
    const terms = termsIn(post);
    if (terms.size) withText++;
    terms.forEach(term => counts.set(term, (counts.get(term) || 0) + 1));
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id')).slice(0, 24);
  const max = ranked[0]?.[1] || 1;
  return { total: rows.length, withText, terms: ranked.map(([term, count]) => ({ term, count, fontSize: 14 + 22 * count / max })) };
}

export function matchingPosts(posts = [], term = '') {
  const rows = uniquePosts(posts).filter(post => term && termsIn(post).has(term.normalize('NFKC').toLowerCase()));
  return { count: rows.length, rows: rows.slice(0, 10) };
}

// Same source-coordinate contract as GeographicView: lat/lon/count/provenance.
// This is a rectangular spatial extent, NOT an administrative boundary.
export function jakartaGrid(locations = [], unknownCount) {
  const cells = Array.from({ length: 100 }, (_, index) => ({ row: Math.floor(index / 10), col: index % 10, count: 0 }));
  const points = validLocations(locations.filter(Boolean)).filter(point => Number.isSafeInteger(point.count) && point.count > 0);
  let inside = 0, outside = 0;
  for (const point of points) {
    if (point.lat < -6.38 || point.lat > -6.08 || point.lon < 106.68 || point.lon > 107) {
      outside += point.count;
      continue;
    }
    const row = Math.min(9, Math.floor((-6.08 - point.lat) / .30 * 10));
    const col = Math.min(9, Math.floor((point.lon - 106.68) / .32 * 10));
    cells[row * 10 + col].count += point.count;
    inside += point.count;
  }
  return { cells, points, located: inside + outside, inside, outside,
    unknown: Number.isSafeInteger(unknownCount) && unknownCount >= 0 ? unknownCount : null,
    rejected: locations.length - points.length };
}

export function publicationHours(posts = []) {
  const rows = uniquePosts(posts);
  const bins = Array(24).fill(0);
  let unknown = 0;
  for (const post of rows) {
    // clock_v1: date-only values have no observed hour. The shared reader refuses impossible dates such as
    // February 30, and the hour is the installation zone's.
    const value = post.published_at;
    if (readTime(value) === null || !hasClock(value)) { unknown++; continue; }
    bins[new Date(localTime(value)).getUTCHours()]++;
  }
  return { bins, total: rows.length, dated: rows.length - unknown, unknown };
}
