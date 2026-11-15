// Geometry of the spread map (src/pulse/RegionSpreadMap.jsx). The outlines in src/pulse/indonesia-provinces.json are
// already projected to a 760 x 330 drawing by scripts/build-pulse-provinces.mjs; nothing here knows the outlines' data.
const WIDTH = 760, HEIGHT = 330;
export const MAX_ZOOM = 16;
const round = value => Math.round(value * 100) / 100;

/** The two shortcuts of the map. Every view has the drawing's own shape (76:33), so no view changes the map's height.
 * `zoom` is how much closer a view is than the whole country: marks are divided by it to keep their size on screen. */
export const mapViews = Object.freeze({
  all: Object.freeze({ label: 'Indonesia', name: 'Indonesia', box: Object.freeze([0, 0, WIDTH, HEIGHT]), zoom: 1 }),
  java: Object.freeze({ label: 'Jawa & Bali', name: 'Jawa dan Bali', box: Object.freeze([171.5, 193.75, 190, 82.5]), zoom: 4 }),
});

/** A view from its box: `[left, top, width, height]` in drawing units. */
export function viewOf(box) {
  return { box, zoom: WIDTH / box[2] };
}
const inside = ([left, top, width, height]) => [round(Math.max(0, Math.min(WIDTH - width, left))), round(Math.max(0, Math.min(HEIGHT - height, top))), round(width), round(height)];

/** The box `factor` times closer (or, under 1, farther) around a point: never wider than the country, never closer
 * than `MAX_ZOOM`, never outside the drawing. Without a point it zooms around its own middle. */
export function zoomBox(box, factor, centre = [box[0] + box[2] / 2, box[1] + box[3] / 2]) {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, WIDTH / box[2] * factor)), width = WIDTH / zoom, height = HEIGHT / zoom;
  return inside([centre[0] - width / 2, centre[1] - height / 2, width, height]);
}
/** The box moved by drawing units, kept inside the drawing. */
export function panBox(box, dx, dy) {
  return inside([box[0] + dx, box[1] + dy, box[2], box[3]]);
}

const SMALLEST = 4, LARGEST = 17;
/** Radius of a bubble in drawing units of the whole-country view. The AREA follows the count (square root), so a
 * province with four times the posts looks four times as large, not sixteen. One post is still a visible dot. */
export function bubbleRadius(count, most) {
  if (!(count > 0) || !(most > 0)) return 0;
  return Math.max(SMALLEST, LARGEST * Math.sqrt(Math.min(count, most) / most));
}

export const SHADES = 5;
/** How dark a province is drawn: 0 (nothing) to 5 (the most of the range), in steps of the square root, so the many
 * provinces far below the largest still differ from each other. */
export function shadeStep(count, most) {
  if (!(count > 0) || !(most > 0)) return 0;
  return Math.min(SHADES, Math.max(1, Math.ceil(SHADES * Math.sqrt(Math.min(count, most) / most) - 1e-9)));
}
/** The counts each shade covers, for the legend. A step that holds no whole number is left out. */
export function shadeRanges(most) {
  const out = [];
  if (!(most > 0)) return out;
  for (let step = 1, from = 1; step <= SHADES; step++) {
    const to = step === SHADES ? most : Math.floor(most * (step / SHADES) ** 2 + 1e-9);
    if (to >= from) { out.push({ step, from, to }); from = to + 1; }
  }
  return out;
}

// Cities the map can pin on their own spot: [longitude, latitude], to two decimals. Only cities that lie clearly
// apart from their province's label point are listed (Jakarta and Yogyakarta fill theirs). Names are spelled as
// src/lib/pulsePlaces.js returns them.
const CITIES = {
  Bogor: [106.8, -6.6], Depok: [106.82, -6.4], Bekasi: [107.0, -6.24], Cikarang: [107.15, -6.26], Karawang: [107.3, -6.31], Bandung: [107.61, -6.91], Cimahi: [107.54, -6.87],
  Sukabumi: [106.93, -6.92], Cianjur: [107.14, -6.82], Garut: [107.9, -7.21], Tasikmalaya: [108.22, -7.33], Cirebon: [108.55, -6.73], Purwakarta: [107.44, -6.56],
  Tangerang: [106.63, -6.18], Tangsel: [106.72, -6.29], Serang: [106.15, -6.12], Cilegon: [106.05, -6.02],
  Semarang: [110.42, -6.97], Solo: [110.82, -7.57], Surakarta: [110.82, -7.57], Magelang: [110.22, -7.47], Pekalongan: [109.68, -6.89], Tegal: [109.13, -6.87],
  Purwokerto: [109.24, -7.42], Banyumas: [109.3, -7.51], Kudus: [110.84, -6.8], Cilacap: [109.01, -7.73], Klaten: [110.6, -7.7],
  Surabaya: [112.75, -7.26], Malang: [112.63, -7.98], Sidoarjo: [112.72, -7.45], Gresik: [112.65, -7.16], Kediri: [112.02, -7.82], Madiun: [111.52, -7.63],
  Jember: [113.7, -8.17], Banyuwangi: [114.37, -8.22], Madura: [113.4, -7.05], Denpasar: [115.22, -8.65],
  Medan: [98.67, 3.59], Padang: [100.35, -0.95], Pekanbaru: [101.45, 0.51], Batam: [104.03, 1.08], Palembang: [104.76, -2.99], 'Bandar Lampung': [105.26, -5.43], 'Banda Aceh': [95.32, 5.55],
  Pontianak: [109.34, -0.03], Banjarmasin: [114.59, -3.32], Samarinda: [117.15, -0.5], Balikpapan: [116.83, -1.27],
  Makassar: [119.42, -5.14], Manado: [124.84, 1.49], Palu: [119.87, -0.9], Kendari: [122.51, -3.99],
  Mataram: [116.12, -8.58], Kupang: [123.61, -10.18], Ambon: [128.18, -3.7], Ternate: [127.38, 0.79], Jayapura: [140.72, -2.53], Sorong: [131.25, -0.88], Manokwari: [134.06, -0.86],
};
const project = ([lon, lat]) => [Math.round((20 + (lon - 94) * 15) * 10) / 10, Math.round((20 + (7 - lat) * 15) * 10) / 10];   // the outlines' own projection

/** The drawing point of a city the map knows, or null. */
export function placePoint(place) {
  return Object.hasOwn(CITIES, place) ? project(CITIES[place]) : null;
}

const NEXT_DOOR = 26;   // screen pixels at the map's nominal width: about one picture
const AROUND = ' dan sekitarnya';
const strongest = (a, b) => (b.interactions ?? -1) - (a.interactions ?? -1) || (b.posts ?? 0) - (a.posts ?? 0) || String(a.author).localeCompare(String(b.author));

/**
 * Where the accounts of the map's account view are pinned, for one view of the map.
 *
 * An account sits on its city when the map knows it (`placePoint`), else on its province's label point. Spots that
 * would overlap on screen are counted together under the busiest one, whose label then ends in "dan sekitarnya";
 * bringing the map closer pulls them apart again, down to single places at the closest view. Spots outside the
 * view are left out. A pin shows the picture of its strongest account, and from twice as close also more of its
 * accounts when there is room around it.
 *
 * @param {{code: string, name: string, accounts: {place: string, interactions?: number|null}[]}[]} rows provinces with their accounts
 * @param {Record<string, [number, number]>} points province code to label point
 * @param {{box: number[], zoom: number}} view from `viewOf`
 * @returns {{key: string, code: string, label: string, x: number, y: number, total: number, spots: number, faces: object[]}[]}
 *   busiest first. `code` is the province of the busiest spot, `spots` how many places the pin stands for, and
 *   `faces` the accounts whose pictures are shown (each with its province as `code`), strongest first.
 */
export function accountPins(rows = [], points = {}, view = viewOf(mapViews.all.box)) {
  const [left, top, width, height] = view.box, spots = new Map();
  for (const row of rows) {
    const home = points[row.code];
    if (!home) continue;
    for (const account of row.accounts || []) {
      const city = placePoint(account.place), [x, y] = city || home;
      if (x < left || x > left + width || y < top || y > top + height) continue;
      const key = row.code + ':' + (city ? account.place : ''), spot = spots.get(key) || { key, code: row.code, label: city ? account.place : row.name, x, y, total: 0, spots: 1, accounts: [] };
      spot.total++;
      spot.accounts.push({ ...account, code: row.code });
      spots.set(key, spot);
    }
  }
  const pins = [];
  for (const spot of [...spots.values()].sort((a, b) => b.total - a.total || strongest([...a.accounts].sort(strongest)[0], [...b.accounts].sort(strongest)[0]) || a.label.localeCompare(b.label))) {
    const near = pins.find(pin => Math.hypot(pin.x - spot.x, pin.y - spot.y) * view.zoom < NEXT_DOOR);
    if (!near) { pins.push(spot); continue; }
    near.total += spot.total;
    near.spots += 1;
    near.accounts.push(...spot.accounts);
    if (!near.label.endsWith(AROUND)) near.label += AROUND;
  }
  return pins.map(({ accounts, ...pin }) => {
    // Room around the pin decides how many pictures it may show: one from afar, a row of three or a ring of seven closer.
    const room = Math.min(Infinity, ...pins.filter(other => other.key !== pin.key).map(other => Math.hypot(other.x - pin.x, other.y - pin.y) * view.zoom));
    const count = view.zoom < 2 ? 1 : room >= 76 ? 7 : room >= 62 ? 3 : 1;
    return { ...pin, faces: accounts.sort(strongest).slice(0, count) };
  }).sort((a, b) => b.total - a.total || strongest(a.faces[0], b.faces[0]));
}

/** Where the pictures of one pin sit around its point, in screen pixels: the strongest in the middle, the next two
 * beside it, further ones in a ring. */
export function faceOffsets(count) {
  if (count <= 1) return [[0, 0]];
  if (count <= 3) return [[0, 0], [-19, 0], [19, 0]].slice(0, count);
  return [[0, 0], ...Array.from({ length: Math.min(count, 7) - 1 }, (_, index) => { const angle = Math.PI / 3 * index - Math.PI / 2; return [Math.round(Math.cos(angle) * 23), Math.round(Math.sin(angle) * 23)]; })];
}
