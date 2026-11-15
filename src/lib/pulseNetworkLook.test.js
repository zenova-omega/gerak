import test from 'node:test';
import assert from 'node:assert/strict';
import { NODE_RADIUS, accountFollowers, edgeShape, edgeWidth, fitLabels, followerCount, nodeRadius, spreadNodes } from './pulseNetworkLook.js';

test('circle size follows followers on a log scale with a floor, a ceiling and a smaller unknown size', () => {
  assert.equal(nodeRadius(null), NODE_RADIUS.unknown);
  assert.equal(nodeRadius(undefined), NODE_RADIUS.unknown);
  assert.equal(nodeRadius(NaN), NODE_RADIUS.unknown);
  assert.equal(nodeRadius('12000'), NODE_RADIUS.unknown);   // a string is not a count
  assert.ok(NODE_RADIUS.unknown < NODE_RADIUS.min);
  // A known zero is a measured small account, not an unknown one.
  assert.equal(nodeRadius(0), NODE_RADIUS.min);
  assert.equal(nodeRadius(1_000), NODE_RADIUS.min);
  assert.equal(nodeRadius(10_000_000), NODE_RADIUS.max);
  assert.equal(nodeRadius(900_000_000), NODE_RADIUS.max);
  // Each tenfold step adds the same amount.
  const steps = [1_000, 10_000, 100_000, 1_000_000, 10_000_000].map(nodeRadius);
  for (let i = 1; i < steps.length; i++) assert.ok(Math.abs((steps[i] - steps[i - 1]) - (NODE_RADIUS.max - NODE_RADIUS.min) / 4) < 0.11);
  assert.equal(nodeRadius(100_000), (NODE_RADIUS.min + NODE_RADIUS.max) / 2);
});

test('an account takes the attached follower count, else the largest one its posts carry', () => {
  const posts = new Map([['1', { metrics: { author_followers: 1200 } }], ['2', { metrics: { author_followers: 5400 } }], ['3', { metrics: {} }]]);
  const account = { evidence: [{ id: '1' }, { id: 2 }, { id: '3' }, { id: 'missing' }] };
  assert.equal(accountFollowers({ followers: 88 }, account, posts), 88);
  assert.equal(accountFollowers({ followers: null }, { ...account, followers: 77 }, posts), 77);
  assert.equal(accountFollowers({}, account, posts), 5400);
  assert.equal(accountFollowers({}, { evidence: [{ id: '3' }] }, posts), null);
  assert.equal(accountFollowers({}, undefined, posts), null);
  assert.equal(accountFollowers(undefined, account, undefined), null);
  assert.equal(followerCount(-5), null);
  assert.equal(followerCount(true), null);
});

test('line thickness grows with the number of linking posts and stops at a ceiling', () => {
  assert.equal(edgeWidth(1), 1.2);
  assert.equal(edgeWidth(0), 1.2);
  assert.equal(edgeWidth(undefined), 1.2);
  assert.ok(edgeWidth(2) > edgeWidth(1) && edgeWidth(5) > edgeWidth(2) && edgeWidth(12) > edgeWidth(5));
  assert.equal(edgeWidth(5), 3);
  assert.equal(edgeWidth(500), 5);
});

test('a line starts and ends at the circle edges and its arrowhead touches the target circle', () => {
  const from = { x: 100, y: 100 }, to = { x: 300, y: 100 };
  const straight = edgeShape(from, to, 20, 30, { gap: 2 });
  assert.equal(straight.d, 'M122 100L268 100');
  assert.equal(straight.head, null);
  const arrow = edgeShape(from, to, 20, 30, { gap: 2, head: 10 });
  assert.equal(arrow.d, 'M122 100L258 100');                       // the line stops at the base of the head
  const corners = arrow.head.split(' ').map(pair => pair.split(',').map(Number));
  assert.deepEqual(corners[0], [268, 100]);                         // the tip sits on the circle edge plus the gap
  assert.equal(corners[1][0], 258); assert.equal(corners[2][0], 258);
  assert.ok(Math.abs(corners[1][1] - 100) === Math.abs(corners[2][1] - 100) && corners[1][1] !== corners[2][1]);
  // A bent line and its reverse bow to opposite sides, so two opposite mentions do not overlap.
  const there = edgeShape(from, to, 20, 30, { bend: 0.2 }).d, back = edgeShape(to, from, 30, 20, { bend: 0.2 }).d;
  const controlY = d => Number(d.match(/Q[\d.-]+ ([\d.-]+)/)[1]);
  assert.ok((controlY(there) - 100) * (controlY(back) - 100) < 0);
  // Circles that touch or overlap leave nothing to draw.
  assert.equal(edgeShape(from, { x: 140, y: 100 }, 20, 30), null);
  assert.equal(edgeShape(from, from, 20, 30), null);
});

test('overlapping circles are pushed apart by their own sizes and stay inside the map', () => {
  const radius = { a: 30, b: 12, c: 9 }, points = { a: { x: 350, y: 250 }, b: { x: 352, y: 250 }, c: { x: 2, y: 499 } };
  spreadNodes(Object.keys(radius), points, id => radius[id], { gap: 8 });
  assert.ok(Math.hypot(points.a.x - points.b.x, points.a.y - points.b.y) >= 30 + 12 + 8 - 0.01);
  assert.ok(points.c.x >= 9 + 4 && points.c.y <= 500 - 9 - 4 - 16);
  // Two small accounts keep at least `floor` between their centres.
  const small = { a: { x: 300, y: 200 }, b: { x: 310, y: 200 } };
  spreadNodes(['a', 'b'], small, () => 9, { gap: 8, floor: 46 });
  assert.ok(Math.hypot(small.a.x - small.b.x, small.a.y - small.b.y) >= 45.99);
  const same = { a: { x: 10, y: 10 }, b: { x: 10, y: 10 } };
  spreadNodes(['a', 'b'], same, () => 10);
  assert.ok(Math.hypot(same.a.x - same.b.x, same.a.y - same.b.y) >= 27.9);
});

test('names are drawn only where they fit, and the account being read always has one', () => {
  const points = { hub: { x: 300, y: 200 }, under: { x: 300, y: 236 }, side: { x: 330, y: 205 }, far: { x: 600, y: 400 }, top: { x: 100, y: 12 } };
  const ids = Object.keys(points), radius = () => 12, label = id => 'akun_' + id;
  const sides = fitLabels(['hub', 'under', 'side', 'far', 'top', 'missing'], ids, points, radius, label);
  assert.equal(sides.get('hub'), 'above');       // another circle sits right under it
  assert.equal(sides.get('under'), 'below');
  assert.equal(sides.has('side'), false);        // below hits the name of "under", above hits the name of "hub"
  assert.equal(sides.get('far'), 'below');
  assert.equal(sides.get('top'), 'below');
  assert.equal(sides.has('missing'), false);
  // The first account keeps its name even when neither side is free.
  const boxed = { a: { x: 300, y: 200 }, b: { x: 300, y: 232 }, c: { x: 300, y: 168 } };
  assert.equal(fitLabels(['a'], Object.keys(boxed), boxed, radius, label).get('a'), 'below');
  assert.equal(fitLabels(['b', 'a'], Object.keys(boxed), boxed, radius, label).has('a'), false);
});

