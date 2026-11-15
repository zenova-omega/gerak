// Pure scales and geometry for the network map. Units are map units: the map is 700 by 500.

/** Circle radii. `unknown` is smaller than any measured size, so an account without a follower count never
 * passes for an account with a small audience. */
export const NODE_RADIUS = { unknown: 9, min: 12, max: 30 };
/** Follower counts at the two ends of the size scale. Counts beyond an end are drawn at that end. */
export const FOLLOWER_SCALE = { min: 1_000, max: 10_000_000 };

/** A usable follower count, or null when the value is missing or not a count. */
export function followerCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Circle radius for a follower count, on a log scale: each tenfold step in followers adds the same amount,
 * so an account with five thousand followers and one with five million both stay readable on one map. The scale is
 * fixed (not relative to the largest account shown), so a size means the same on every map and during replay. */
export function nodeRadius(followers) {
  const count = followerCount(followers);
  if (count === null) return NODE_RADIUS.unknown;
  const low = Math.log10(FOLLOWER_SCALE.min), high = Math.log10(FOLLOWER_SCALE.max);
  const share = Math.min(1, Math.max(0, (Math.log10(Math.max(count, 1)) - low) / (high - low)));
  return Math.round((NODE_RADIUS.min + share * (NODE_RADIUS.max - NODE_RADIUS.min)) * 10) / 10;
}

/** Follower count of one account: the figure the analysis attached to it, otherwise the largest figure its
 * collected posts carry. Null when no post reports one (news sites, accounts that were only mentioned). */
export function accountFollowers(node, account, postsById) {
  const attached = followerCount(node?.followers) ?? followerCount(account?.followers);
  if (attached !== null) return attached;
  let largest = null;
  for (const row of account?.evidence || []) {
    const count = followerCount(postsById?.get(String(row.id))?.metrics?.author_followers);
    if (count !== null && (largest === null || count > largest)) largest = count;
  }
  return largest;
}

/** Line thickness from the number of posts that link two accounts, on a square-root scale with a ceiling:
 * 1 post is 1.2, 5 posts 3, 18 or more 5. */
export function edgeWidth(count) {
  const posts = Number.isFinite(count) ? Math.max(1, count) : 1;
  return Math.round(Math.min(5, 1.2 + Math.sqrt(posts - 1) * 0.9) * 100) / 100;
}

/** One relation as a drawable line between two circles. The line starts and stops at the circle edges
 * (plus `gap`), so an arrowhead is never hidden under the account it points to. `bend` bows the line to one
 * side of its direction (0 is straight), which keeps "A menyebut B" and "B menyebut A" apart. `head` is the
 * arrowhead length (0 for none). Returns null when the circles are too close to draw anything between them.
 * @returns {{d: string, head: string|null}|null} */
export function edgeShape(from, to, fromRadius, toRadius, { bend = 0, head = 0, gap = 2 } = {}) {
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
  if (!(length > fromRadius + toRadius + gap * 2 + head + 2)) return null;
  const cx = (from.x + to.x) / 2 - dy * bend, cy = (from.y + to.y) / 2 + dx * bend;
  const toward = (point, distance) => {
    const ux = cx - point.x, uy = cy - point.y, d = Math.hypot(ux, uy) || 1;
    return { x: point.x + ux / d * distance, y: point.y + uy / d * distance, ux: ux / d, uy: uy / d };
  };
  const start = toward(from, fromRadius + gap), tip = toward(to, toRadius + gap), end = toward(to, toRadius + gap + head);
  const n = value => Math.round(value * 10) / 10;
  const d = `M${n(start.x)} ${n(start.y)}` + (bend ? `Q${n(cx)} ${n(cy)} ` : 'L') + `${n(end.x)} ${n(end.y)}`;
  if (!head) return { d, head: null };
  const half = head * 0.42;
  const corners = [[tip.x, tip.y], [end.x - tip.uy * half, end.y + tip.ux * half], [end.x + tip.uy * half, end.y - tip.ux * half]];
  return { d, head: corners.map(([x, y]) => n(x) + ',' + n(y)).join(' ') };
}

/** Pushes circles apart until each pair is at least the sum of its radii plus `gap` apart (and never closer
 * than `floor` centre to centre, which leaves room for lines and names between small accounts), and keeps
 * every circle (and the name under it) inside the map. Moves `points` in place; relations are untouched. */
export function spreadNodes(ids, points, radiusOf, { width = 700, height = 500, gap = 8, floor = 0, label = 16, passes = 35 } = {}) {
  const keep = id => {
    const point = points[id], r = radiusOf(id) + 4;
    point.x = Math.max(r, Math.min(width - r, point.x));
    point.y = Math.max(r, Math.min(height - r - label, point.y));
  };
  ids.forEach(keep);
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = points[ids[i]], b = points[ids[j]], need = Math.max(floor, radiusOf(ids[i]) + radiusOf(ids[j]) + gap);
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= need) continue;
      const ux = d ? dx / d : 1, uy = d ? dy / d : 0, push = (need - d) / 2;
      a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
      keep(ids[i]); keep(ids[j]);
      moved = true;
    }
    if (!moved) break;
  }
  return points;
}

/** Where account names can be drawn without running into another circle or an earlier name. `order` lists
 * the accounts worth naming, most important first; each gets its name under the circle, above it when below
 * is taken, or no name at all. The first one is always named, because it is the account being read.
 * @returns {Map<string, 'below'|'above'>} */
export function fitLabels(order, ids, points, radiusOf, labelOf, { char = 6.4, height = 13, reach = 0 } = {}) {
  const placed = [], sides = new Map();
  const free = (id, box) => !placed.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)
    && !ids.some(other => {
      if (other === id) return false;
      const centre = points[other], x = Math.max(box.left, Math.min(centre.x, box.right)), y = Math.max(box.top, Math.min(centre.y, box.bottom));
      return Math.hypot(centre.x - x, centre.y - y) < radiusOf(other) + 2;
    });
  order.forEach((id, rank) => {
    const point = points[id];
    if (!point || sides.has(id)) return;
    const half = Math.min(19, String(labelOf(id) || '').length) * char / 2, r = radiusOf(id) + (rank === 0 ? reach : 0);
    const below = { left: point.x - half, right: point.x + half, top: point.y + r + 3, bottom: point.y + r + 3 + height };
    const above = { ...below, top: point.y - r - 3 - height, bottom: point.y - r - 3 };
    const side = free(id, below) ? 'below' : free(id, above) && above.top > 0 ? 'above' : rank === 0 ? 'below' : null;
    if (!side) return;
    sides.set(id, side);
    placed.push(side === 'below' ? below : above);
  });
  return sides;
}

