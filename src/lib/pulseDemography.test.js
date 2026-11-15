import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RULES, RULE_TEXT, TIERS, REGIONS, COMPARE_MIN_ROWS, NEGATIVE_MIN_ANALYSED, WHERE_MIN_ACCOUNTS, followersOf, tierOf, accountTiers, countryOf, accountOrigin, groupLead, leadSentences,
  shareText, followersKnownShare, followersKnownInteractionShare, provinceReadShare, accountShare } from './pulseDemography.js';
import { RULES as MEASURES } from './pulseMeasures.js';
import { RULES as READINGS } from './pulseReadings.js';

const CASES = JSON.parse(readFileSync(new URL('../../shared/pulse-demography.cases.json', import.meta.url), 'utf8'));
const ZONE = CASES.zone;
const each = (name, check) => {
  for (const [index, item] of CASES[name].entries()) test(`${name}: ${item.note || index}`, () => check(item));
};
/** `{"times": n, ...}` stands for n posts; `{i}` in the author becomes 01, 02, ... */
const posts = rows => rows && rows.flatMap(row => Array.from({ length: row.times ?? 1 }, (_, index) => {
  const { times, ...post } = row;
  if (typeof post.author === 'string') post.author = post.author.replace('{i}', String(index + 1).padStart(2, '0'));
  if (times !== undefined && 'id' in post) post.id = `${post.id}-${index + 1}`;
  return post;
}));
/** Equal, with a share written as "3/11" compared as a number. */
function same(actual, expected, path = 'out') {
  if (typeof expected === 'string' && /^[0-9]+\/[0-9]+$/.test(expected)) {
    const [top, bottom] = expected.split('/').map(Number);
    assert.equal(typeof actual, 'number', path);
    assert.ok(Math.abs(actual - top / bottom) < 1e-9, `${path}: ${actual} is not ${expected}`);
  } else if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual) && actual.length === expected.length, `${path}: ${JSON.stringify(actual)}`);
    expected.forEach((item, index) => same(actual[index], item, `${path}[${index}]`));
  } else if (expected && typeof expected === 'object') {
    assert.ok(actual && typeof actual === 'object' && !Array.isArray(actual), `${path}: ${JSON.stringify(actual)}`);
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), path);
    for (const key of Object.keys(expected)) same(actual[key], expected[key], `${path}.${key}`);
  } else if (typeof expected === 'number') {
    assert.equal(typeof actual, 'number', path);
    assert.ok(Math.abs(actual - expected) < 1e-9, `${path}: ${actual} is not ${expected}`);
  } else assert.equal(actual, expected, path);
}

test('rule names, versions and sentences', () => {
  assert.deepEqual(Object.entries(RULES), CASES.rules.map(rule => [rule.name, rule.version]));
  assert.deepEqual(RULE_TEXT, Object.fromEntries(CASES.rules.map(rule => [rule.name, rule.text])));
  for (const text of Object.values(RULE_TEXT)) assert.ok(/^[A-Z]/.test(text) && !text.includes('—'));
  const taken = new Set([...Object.keys(MEASURES), ...Object.keys(READINGS)]);
  assert.equal(Object.keys(RULES).filter(name => taken.has(name)).length, 0, 'a reading never reuses the name of an earlier rule');
  assert.equal(Object.values(RULES).filter(version => [...Object.values(MEASURES), ...Object.values(READINGS)].includes(version)).length, 0);
});

test('the tiers, in the order of the rows', () => {
  assert.deepEqual(TIERS.map(tier => tier.key), ['news', '1m', '100k', '10k', '1k', 'small', 'unknown']);
  assert.deepEqual(TIERS.map(tier => tier.label), ['Pemberitaan', '≥1 jt', '100 rb–1 jt', '10–100 rb', '1–10 rb', '<1 rb', 'Pengikut tidak diketahui']);
  assert.deepEqual(TIERS.filter(tier => 'min' in tier).map(tier => tier.min), [1000000, 100000, 10000, 1000, 0]);
});

each('followers', item => assert.deepEqual(Object.fromEntries(followersOf(posts(item.in))), item.out));
test('followers: a Map keyed by account', () => assert.ok(followersOf(null) instanceof Map));
each('tiers', item => same(accountTiers(posts(item.in)), item.out));

test('the post shares of all rows add up to one, and the rows keep the order of the tiers', () => {
  for (const item of CASES.tiers) {
    const reading = accountTiers(posts(item.in));
    if (!reading.rows.length) continue;
    assert.ok(Math.abs(reading.rows.reduce((sum, row) => sum + row.post_share, 0) - 1) < 1e-9, item.note);
    assert.equal(reading.rows.reduce((sum, row) => sum + row.posts, 0), reading.total, item.note);
    const order = reading.rows.map(row => TIERS.findIndex(tier => tier.key === row.key));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), item.note);
    assert.ok(reading.rows.every(row => row.top.length <= 3 && row.accounts > 0 && row.posts > 0), item.note);
  }
});

test('the platforms of a row hold exactly its posts and its known interactions', () => {
  for (const item of [...CASES.tiers, ...CASES.lead]) {
    for (const row of accountTiers(posts(item.in)).rows) {
      assert.equal(row.platforms.reduce((sum, platform) => sum + platform.posts, 0), row.posts, `${item.note}: ${row.key}`);
      const known = row.platforms.filter(platform => platform.interactions !== null);
      assert.equal(known.length ? known.reduce((sum, platform) => sum + platform.interactions, 0) : null, row.interactions.value, `${item.note}: ${row.key}`);
    }
  }
});

each('tier_of', item => {
  const rows = posts(item.in), followers = followersOf(rows);
  assert.deepEqual(rows.map(post => tierOf(post, followers)), item.out);
});

test('a row of the tiers holds exactly the posts tierOf places in it', () => {
  for (const item of CASES.tiers) {
    const rows = posts(item.in), followers = followersOf(rows), placed = new Map();
    for (const post of rows) { const key = tierOf(post, followers); placed.set(key, (placed.get(key) || 0) + 1); }
    assert.deepEqual(accountTiers(rows).rows.map(row => [row.key, row.posts]), [...placed].sort((a, b) => TIERS.findIndex(tier => tier.key === a[0]) - TIERS.findIndex(tier => tier.key === b[0])), item.note);
  }
});

test('the readings do not change the posts they are given', () => {
  const rows = posts(CASES.tiers[1].in), before = JSON.stringify(rows);
  followersOf(rows); accountTiers(rows);
  assert.equal(JSON.stringify(rows), before);
});

test('posts that carry their own measures are read through them', () => {
  const rows = [{ platform: 'x', author: '@a', metrics: { author_followers: 5000, likes: 1 }, measures: { account: 'x:a', interactions: 9, tone: 'negative', day: null, clock: false } }];
  const reading = accountTiers(rows);
  assert.equal(reading.rows[0].interactions.value, 9);
  assert.equal(reading.rows[0].tone.analysed, 1);
});

/** What an `origin` case compares: no `post` on a row, no undefined, a tone as {analysed, unknown}. */
function shown(reading, only) {
  const tone = value => ({ analysed: value.analysed, unknown: value.unknown });
  const group = ({ tone: own, ...rest }) => ({ ...rest, tone: tone(own) });
  const whole = {
    ...reading, country: Object.fromEntries(Object.entries(reading.country).map(([name, row]) => [name, group(row)])),
    provinces: reading.provinces.map(group),
    rows: reading.rows.map(({ post, ...row }) => (void post, { ...row, location: row.location ?? null, based_in: row.based_in ?? null })),
  };
  return only ? Object.fromEntries(only.map(key => [key, whole[key]])) : whole;
}
each('origin', item => same(shown(accountOrigin(posts(item.in)), item.only), item.out));

test('origin: the splits add up, and the rows carry the post that was read', () => {
  for (const item of CASES.origin) {
    const reading = accountOrigin(posts(item.in));
    assert.equal(reading.unasked + reading.no_location + reading.with_location, reading.accounts, item.note);
    assert.equal(Object.values(reading.country).reduce((sum, group) => sum + group.accounts, 0), reading.accounts, item.note);
    assert.equal(reading.rows.length, reading.accounts, item.note);
    assert.deepEqual(Object.keys(reading.country), ['indonesia', 'abroad', 'region_only', 'unknown']);
    assert.ok(reading.rows.every(row => row.post && row.post.platform === 'x'), item.note);
  }
});

each('country_of', item => assert.deepEqual(item.in.map(countryOf), item.out));

test('origin: a country group holds exactly the accounts countryOf places in it', () => {
  for (const item of CASES.origin) {
    const reading = accountOrigin(posts(item.in));
    for (const [name, group] of Object.entries(reading.country)) {
      assert.equal(reading.rows.filter(row => countryOf(row.based_in) === name).length, group.accounts, `${item.note}: ${name}`);
    }
  }
});

each('shares', item => {
  const rows = posts(item.in), tiers = accountTiers(rows), origin = accountOrigin(rows);
  same({
    followers_known: followersKnownShare(tiers), followers_known_interactions: followersKnownInteractionShare(tiers), province_read: provinceReadShare(origin),
    country: Object.fromEntries(Object.entries(origin.country).map(([name, group]) => [name, accountShare(group, origin)])),
    provinces: Object.fromEntries(origin.provinces.map(province => [province.code, accountShare(province, origin)])),
  }, item.out);
});

test('lead: the province sentence reads its share from provinceReadShare', () => {
  for (const item of CASES.lead) {
    const rows = posts(item.in), origin = accountOrigin(rows), lead = groupLead(accountTiers(rows), origin);
    if (lead.where) assert.equal(lead.where.read_share, provinceReadShare(origin), item.note);
  }
});

test('a share in words: a whole percent, cut and never rounded up; a sliver is "<1%"; nothing known is a dash', () => {
  assert.deepEqual([0, 0.004, 0.0099, 0.01, 0.29, 0.52, 0.999, 1].map(shareText), ['0%', '<1%', '<1%', '1%', '29%', '52%', '99%', '100%']);
  assert.equal(shareText(null), '—');
  assert.equal(shareText(undefined), '—');
});

const origin = note => CASES.origin.find(item => item.note.startsWith(note));
test('origin: the row names the most recently published post of the account', () => {
  const item = origin('a row\'s post'), rows = posts(item.in), reading = accountOrigin(rows);
  for (const [key, index] of Object.entries(item.post)) assert.equal(reading.rows.find(row => row.key === key).post, rows[index]);
});

test('origin: the regions, and the reading does not change the posts', () => {
  assert.ok(['Southeast Asia', 'West Asia', 'East Asia & Pacific', 'East Asia'].every(name => REGIONS.includes(name)));
  assert.ok(!REGIONS.includes('Indonesia'));
  const rows = posts(origin('the base splits').in), before = JSON.stringify(rows);
  accountOrigin(rows);
  assert.equal(JSON.stringify(rows), before);
  assert.equal(accountOrigin(null).accounts, 0);
});

// The fix wave of 15 Nov changed some expectations; each changed case's note says why (a tie is no lead; a gap is said
// instead of a winner it could overturn; the interaction share is said to be over known interactions).
const leadOf = rows => groupLead(accountTiers(rows), accountOrigin(rows));
each('lead', item => same(leadOf(posts(item.in)), item.out));
/** How the page names a platform (PLATFORM_LABEL in PlatformIcon.jsx), for the platforms the cases use. */
const PLATFORM_NAMES = { instagram: 'Instagram', tiktok: 'TikTok', threads: 'Threads', x: 'X' };
const platformName = key => PLATFORM_NAMES[key] || key;
each('lead_sentences', item => {
  const rows = posts(item.in), tiers = accountTiers(rows), origin = accountOrigin(rows);
  assert.deepEqual(leadSentences(groupLead(tiers, origin), tiers, origin, { sentimentFiltered: item.sentiment_filtered, platformName }), item.out);
});

test('lead: a group is named only when its lead is larger than the unknown row\'s share, and the gap only when that share reaches the leader', () => {
  const measures = { posts: row => row.posts, interactions: row => row.interactions.value ?? 0 };
  for (const item of CASES.lead) {
    const tiers = accountTiers(posts(item.in)), lead = groupLead(tiers, accountOrigin(posts(item.in)));
    if (!lead.carrier) continue;
    const rows = tiers.rows.filter(row => row.key !== 'unknown'), unknown = tiers.rows.find(row => row.key === 'unknown');
    for (const [measure, value] of Object.entries(measures)) {
      const ranked = rows.map(value).sort((a, b) => b - a), gap = unknown ? value(unknown) : 0;
      const named = lead.carrier[`${measure}_row`], said = lead.carrier[`${measure}_gap`];
      assert.equal(named !== null, ranked[0] - (ranked[1] ?? 0) > gap, `${item.note}: ${measure} named`);
      if (named !== null) assert.equal(value(rows.find(row => row.key === named)), ranked[0], `${item.note}: ${measure} leader`);
      assert.equal(said !== null, gap > 0 && gap >= ranked[0], `${item.note}: ${measure} gap`);
      if (said) {
        assert.ok(said.platforms.length >= 1 && said.platforms.length <= 2, item.note);
        assert.ok(said.platforms.every((platform, index) => platform.share > 0 && (index === 0 || platform.share <= said.platforms[index - 1].share)), item.note);
        assert.ok(said.platforms.reduce((sum, platform) => sum + platform.share, 0) <= 1 + 1e-9, item.note);
      }
    }
  }
});

test('lead: the most negative is never a row with no negative post, and is qualified exactly when the unknown row has 20 analysed posts', () => {
  for (const item of CASES.lead) {
    const tiers = accountTiers(posts(item.in)), lead = groupLead(tiers, accountOrigin(posts(item.in)));
    if (!lead.negative) continue;
    const row = tiers.rows.find(own => own.key === lead.negative.row), unknown = tiers.rows.find(own => own.key === 'unknown');
    assert.notEqual(row.tone.text.negative, '0%', item.note);
    assert.equal(lead.negative.unknown !== null, (unknown?.tone.analysed ?? 0) >= NEGATIVE_MIN_ANALYSED, item.note);
    if (lead.negative.unknown) assert.equal(lead.negative.unknown.more_negative, unknown.tone.percent.negative > lead.negative.share, item.note);
  }
});

test('lead: the thresholds', () => {
  assert.equal(COMPARE_MIN_ROWS, 2);
  assert.equal(NEGATIVE_MIN_ANALYSED, 20);
  assert.equal(WHERE_MIN_ACCOUNTS, 10);
});

test('lead: nothing but a name from TIERS, never the unknown row, and no sentence for a missing reading', () => {
  const names = new Set(TIERS.filter(tier => tier.key !== 'unknown').map(tier => tier.key));
  for (const item of CASES.lead) {
    const lead = leadOf(posts(item.in));
    for (const row of [lead.carrier?.posts_row, lead.carrier?.interactions_row, lead.negative?.row]) assert.ok(row == null || names.has(row), item.note);
  }
  assert.deepEqual(leadSentences({ carrier: null, negative: null, where: null }, accountTiers([]), accountOrigin([]), { sentimentFiltered: false }), []);
  assert.deepEqual(leadSentences(null, null, null, { sentimentFiltered: false }), []);
});

test('lead: the readings do not change the posts', () => {
  const rows = posts(CASES.lead[5].in), before = JSON.stringify(rows);
  leadOf(rows);
  assert.equal(JSON.stringify(rows), before);
});
