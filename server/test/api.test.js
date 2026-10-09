import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../app.js';

let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { if (server?.listening) await new Promise((resolve) => server.close(resolve)); });
const post = (body) => fetch(`${base}/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('health and selection options return JSON', async () => {
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const { majors, campuses } = await (await fetch(`${base}/majors`)).json();
  assert.equal(majors.length, 11); assert.equal(campuses.length, 6);
  assert.equal((await (await fetch(`${base}/interests`)).json()).interests.length, 10);
});
test('events endpoint returns 25 labeled demo events and source metadata', async () => {
  const response = await fetch(`${base}/events`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.events.length, 25);
  assert.equal(body.meta.mode, 'demo');
  assert.ok(body.events.every((event) => event.isDemo));
});
test('GET event search and campus filters combine correctly', async () => {
  const { events } = await (await fetch(`${base}/events?campus=Stamford&search=hackathon`)).json();
  assert.equal(events.length, 1);
  assert.match(events[0].title, /AI hack night/);
});
test('recommendation endpoint accepts AI alias and orders by score', async () => {
  const response = await post({ major: 'Computer Science', campus: 'Stamford', interests: ['AI', 'Technology'] });
  assert.equal(response.status, 200);
  const { events, preferences } = await response.json();
  assert.ok(events.length > 0);
  assert.ok(events.every((event) => event.campus === 'Stamford'));
  assert.ok(events.every((event, index) => !index || event.relevanceScore <= events[index - 1].relevanceScore));
  assert.ok(preferences.interests.includes('Artificial Intelligence'));
});
test('API validates preferences, filters, and source', async () => {
  for (const body of [{ major: 'Unknown' }, { interests: 'AI' }, { filters: { sort: 'random' } }, { filters: null }, { filters: { search: ['x'] } }, { source: 'private' }, []]) assert.equal((await post(body)).status, 400);
  assert.equal((await fetch(`${base}/events?campus=Mars`)).status, 400);
  assert.equal((await fetch(`${base}/events?source=private`)).status, 400);
  assert.equal((await fetch(`${base}/events?search=a&search=b`)).status, 400);
});
test('malformed JSON and unknown routes return clear errors', async () => {
  const bad = await fetch(`${base}/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /valid JSON/);
  const missing = await fetch(`${base}/unknown`);
  assert.equal(missing.status, 404);
  assert.ok((await missing.json()).error);
});
