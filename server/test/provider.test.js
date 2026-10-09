import test from 'node:test';
import assert from 'node:assert/strict';
import { campusDate, createLiveProvider, getDemoEvents, normalizeLiveEvent, plainText } from '../services/eventProvider.js';

const live = { id: 123, title: 'AI &amp; research', date_iso: '2026-10-10T18:00:00-04:00', date2_iso: '2026-10-10T20:00:00-04:00', summary: '<p>Come learn</p>', description: '<p>Try coding!</p>', event_types_campus: ['Stamford'], location_title: 'Room 100', group_title: 'Public Club', url: 'https://events.uconn.edu/event/123', tags: [], event_types: [] };

test('demo data has 25 unique, clearly labeled upcoming events', () => {
  const now = new Date('2026-10-09T23:59:00-04:00');
  const events = getDemoEvents(now);
  assert.equal(events.length, 25);
  assert.equal(new Set(events.map((event) => event.id)).size, 25);
  assert.ok(events.every((event) => event.isDemo && event.url === null && new Date(event.startDate) > now));
});
test('Eastern wall time handles daylight saving offsets', () => {
  assert.equal(campusDate('2026-10-09', '18:00'), '2026-10-09T22:00:00.000Z');
  assert.equal(campusDate('2026-11-09', '18:00'), '2026-11-09T23:00:00.000Z');
});
test('live normalization preserves real source metadata and strips HTML', () => {
  const event = normalizeLiveEvent(live);
  assert.equal(event.title, 'AI & research');
  assert.equal(event.description, 'Come learn\n\nTry coding!');
  assert.equal(event.isDemo, false);
  assert.equal(event.campus, 'Stamford');
  assert.equal(event.organization, 'Public Club');
  assert.equal(event.startDate, '2026-10-10T22:00:00.000Z');
  assert.equal(event.url, live.url);
});
test('missing fields and invalid dates are handled without inventing details', () => {
  const event = normalizeLiveEvent({ id: 2, title: 'Hello', date_iso: live.date_iso, url: 'javascript:alert(1)' });
  assert.equal(event.description, '');
  assert.equal(event.campus, 'Campus not listed');
  assert.equal(event.url, null);
  assert.equal(normalizeLiveEvent({ ...live, date_iso: 'invalid' }), null);
  assert.equal(normalizeLiveEvent({ ...live, is_canceled: 1 }), null);
  assert.equal(normalizeLiveEvent(null), null);
});
test('all-day event remains upcoming until midnight Eastern', () => {
  const event = normalizeLiveEvent({ ...live, date_iso: '2026-10-10T00:00:00-04:00', date2_iso: null, is_all_day: 1 });
  assert.equal(event.endDate, '2026-10-11T04:00:00.000Z');
});
test('plain text handles entities safely, including invalid code points', () => {
  assert.equal(plainText('<script>unsafe()</script><p>Hi &#128075; &amp; &#99999999;</p>'), 'Hi 👋 &');
});
test('live feed caches results and deduplicates repeated occurrences', async () => {
  let calls = 0;
  const provider = createLiveProvider(async () => { calls++; return { ok: true, json: async () => ({ data: [live, live], meta: { total_results: 1 }, links: {} }) }; });
  const [first, second] = await Promise.all([provider(), provider()]);
  assert.equal(first.meta.mode, 'live');
  assert.equal(first.events.length, 1);
  assert.equal(second.events.length, 1);
  await provider();
  assert.equal(calls, 1);
});
test('live provider bounds pagination to three pages', async () => {
  let calls = 0;
  const provider = createLiveProvider(async () => ({ ok: true, json: async () => ({ data: [{ ...live, id: ++calls }], meta: { total_results: 1000 }, links: { next: 'next' } }) }));
  const result = await provider();
  assert.equal(calls, 3);
  assert.equal(result.meta.limited, true);
});
test('network, HTTP, empty feed, and schema failures clearly fall back to demo', async () => {
  for (const fetcher of [async () => { throw new Error('offline'); }, async () => ({ ok: false, status: 503 }), async () => ({ ok: true, json: async () => ({ nope: true }) }), async () => ({ ok: true, json: async () => ({ data: [] }) })]) {
    const data = await createLiveProvider(fetcher)();
    assert.equal(data.meta.mode, 'demo');
    assert.equal(data.events.length, 25);
    assert.match(data.meta.warning, /fictional demo events/);
  }
});
