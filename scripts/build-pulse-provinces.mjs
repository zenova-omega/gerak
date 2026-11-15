// Builds src/pulse/indonesia-provinces.json, the province outlines behind the spread map on Jaringan.
//
//   node scripts/build-pulse-provinces.mjs <path to geoBoundaries-IDN-ADM1_simplified.geojson>
//
// Source (pinned): https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IDN/ADM1/geoBoundaries-IDN-ADM1_simplified.geojson
// Licence and attribution: deploy/pulse/MAP-ATTRIBUTION.md. The upstream file is 3.4 MB; this script projects it to
// the map's 760 x 330 drawing, thins the outlines to what that size can show, drops islets too small to see and
// writes one path and one label point per province. Rerun it only when the source or the drawing size changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { projectIndonesia } from '../src/lib/pulseMap.js';

const TOLERANCE = 0.22;   // drawing units an outline may move while it is thinned (the drawing is 760 wide)
const MIN_AREA = 0.35;    // islands smaller than this many square units are left out, unless they are all a province has
const NAMES = {
  'ID-AC': 'Aceh', 'ID-SU': 'Sumatera Utara', 'ID-SB': 'Sumatera Barat', 'ID-RI': 'Riau', 'ID-KR': 'Kepulauan Riau', 'ID-JA': 'Jambi',
  'ID-SS': 'Sumatera Selatan', 'ID-BB': 'Kepulauan Bangka Belitung', 'ID-BE': 'Bengkulu', 'ID-LA': 'Lampung', 'ID-JK': 'DKI Jakarta',
  'ID-JB': 'Jawa Barat', 'ID-BT': 'Banten', 'ID-JT': 'Jawa Tengah', 'ID-YO': 'DI Yogyakarta', 'ID-JI': 'Jawa Timur', 'ID-BA': 'Bali',
  'ID-NB': 'Nusa Tenggara Barat', 'ID-NT': 'Nusa Tenggara Timur', 'ID-KB': 'Kalimantan Barat', 'ID-KT': 'Kalimantan Tengah',
  'ID-KS': 'Kalimantan Selatan', 'ID-KI': 'Kalimantan Timur', 'ID-KU': 'Kalimantan Utara', 'ID-SA': 'Sulawesi Utara', 'ID-GO': 'Gorontalo',
  'ID-ST': 'Sulawesi Tengah', 'ID-SR': 'Sulawesi Barat', 'ID-SN': 'Sulawesi Selatan', 'ID-SG': 'Sulawesi Tenggara', 'ID-MA': 'Maluku',
  'ID-MU': 'Maluku Utara', 'ID-PA': 'Papua', 'ID-PB': 'Papua Barat',
};

const round = value => Math.round(value * 10) / 10;
const area = ring => Math.abs(ring.reduce((sum, [x, y], i) => { const [nx, ny] = ring[(i + 1) % ring.length]; return sum + x * ny - nx * y; }, 0)) / 2;

function distanceToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** Douglas-Peucker on an open line, without recursion (some outlines have thousands of points). */
function thin(points, tolerance) {
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let far = 0, index = -1;
    for (let i = first + 1; i < last; i++) { const d = distanceToSegment(points[i], points[first], points[last]); if (d > far) { far = d; index = i; } }
    if (far > tolerance) { keep[index] = 1; stack.push([first, index], [index, last]); }
  }
  return points.filter((_, i) => keep[i]);
}

/** A closed ring, thinned in two halves so its start point is not special, then rounded. */
function thinRing(ring) {
  const open = ring.slice(0, -1);
  if (open.length < 4) return open;
  let far = 0, split = 1;
  open.forEach(([x, y], i) => { const d = Math.hypot(x - open[0][0], y - open[0][1]); if (d > far) { far = d; split = i; } });
  const out = [...thin(open.slice(0, split + 1), TOLERANCE).slice(0, -1), ...thin([...open.slice(split), open[0]], TOLERANCE).slice(0, -1)].map(([x, y]) => [round(x), round(y)]);
  return out.filter(([x, y], i) => { const [px, py] = out[(i + out.length - 1) % out.length]; return x !== px || y !== py; });
}

function inside([x, y], ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The point inside a ring that is farthest from its edge: where a bubble and a label sit without leaving the land. */
function labelPoint(ring) {
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let best = [(x0 + x1) / 2, (y0 + y1) / 2], bestDistance = -1;
  const steps = 48;
  for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
    const point = [x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * j / steps];
    if (!inside(point, ring)) continue;
    let nearest = Infinity;
    for (let k = 0; k < ring.length; k++) nearest = Math.min(nearest, distanceToSegment(point, ring[k], ring[(k + 1) % ring.length]));
    if (nearest > bestDistance) { bestDistance = nearest; best = point; }
  }
  return best.map(round);
}

const source = process.argv[2];
if (!source) { console.error('usage: node scripts/build-pulse-provinces.mjs <geoBoundaries ADM1 geojson>'); process.exit(1); }
const collection = JSON.parse(readFileSync(source, 'utf8'));
let before = 0, after = 0;
const provinces = collection.features.map(feature => {
  const code = feature.properties.shapeISO, name = NAMES[code];
  if (!name) throw new Error('unknown province code in the source: ' + code);
  const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
  // Outer rings only: lakes and enclaves are too small to matter at this size.
  const rings = polygons.map(polygon => polygon[0].map(([lon, lat]) => projectIndonesia(lon, lat))).sort((a, b) => area(b) - area(a));
  before += rings.reduce((sum, ring) => sum + ring.length, 0);
  const kept = rings.filter((ring, i) => i === 0 || area(ring) >= MIN_AREA).map(thinRing).filter(ring => ring.length >= 3);
  after += kept.reduce((sum, ring) => sum + ring.length, 0);
  const [x, y] = labelPoint(kept[0]);
  return { code, name, x, y, d: kept.map(ring => 'M' + ring.map(([px, py]) => px + ',' + py).join(' ') + 'Z').join('') };
}).sort((a, b) => a.code.localeCompare(b.code));

const out = {
  source: 'geoBoundaries gbOpen IDN ADM1 (IDN-ADM1-65028918), boundaries as of 2017, © OpenStreetMap contributors, ODbL 1.0',
  note: 'Generated by scripts/build-pulse-provinces.mjs. Thinned for a 760 x 330 drawing: not for measuring or legal use.',
  viewBox: [0, 0, 760, 330],
  provinces,
};
const target = fileURLToPath(new URL('../src/pulse/indonesia-provinces.json', import.meta.url));
writeFileSync(target, JSON.stringify(out) + '\n');
console.log(`${provinces.length} provinces, ${before} points in, ${after} points out, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB -> ${target}`);
