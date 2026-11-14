// Word-cloud packing: biggest first, each item walks an elliptical spiral out from the centre and
// takes the first spot where its box touches nothing already placed. Pure and deterministic, so the
// cloud is the same on every render and can be tested.

/** @param {{key: string, w: number, h: number}[]} items largest first
 *  @returns items that fit, each with `x`, `y` (top-left of its own box) */
export function packCloud(items, { width = 1000, height = 380, gap = 6, stretch = 1.7 } = {}) {
  const placed = [];
  for (const item of items) {
    const w = item.w + gap, h = item.h + gap;
    if (w > width || h > height) continue;
    for (let step = 0; step < 2400; step++) {
      const angle = step * 0.31, radius = step * 0.42;
      const x = width / 2 + Math.cos(angle) * radius * stretch - w / 2;
      const y = height / 2 + Math.sin(angle) * radius - h / 2;
      if (x < 0 || y < 0 || x + w > width || y + h > height) continue;
      if (placed.some(other => x < other.bx + other.bw && x + w > other.bx && y < other.by + other.bh && y + h > other.by)) continue;
      placed.push({ ...item, x: x + gap / 2, y: y + gap / 2, bx: x, by: y, bw: w, bh: h });
      break;
    }
  }
  return placed.map(({ bx, by, bw, bh, ...item }) => item);   // eslint-disable-line no-unused-vars
}

/** Size on a log scale, so one runaway count does not flatten everything else to the minimum. */
export function cloudSize(count, min, max, smallest, largest) {
  if (max <= min) return (smallest + largest) / 2;
  const t = (Math.log(count) - Math.log(min)) / (Math.log(max) - Math.log(min));
  return smallest + (largest - smallest) * Math.max(0, Math.min(1, t)) ** 1.35;
}
