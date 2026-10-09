import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEvents, hasKeyword, normalizePreferences, recommendEvents, scoreEvent } from '../services/recommendations.js';
import { filterEvents as clientFilterEvents } from '../../client/src/services/api.js';

const now = new Date('2026-10-09T14:00:00Z');
const prefs = { major: 'Computer Science', campus: 'Stamford', interests: ['Technology'] };
const event = (overrides = {}) => ({ id: 'one', title: 'Campus meetup', description: '', campus: 'Stamford', category: 'Networking', startDate: '2026-10-10T18:00:00Z', endDate: '2026-10-10T20:00:00Z', ...overrides });

test('keyword matching respects words, case, punctuation, and Unicode boundaries', () => {
  for (const text of ['chair', 'email', 'fair', 'AItools', 'éAI', 'AI_guide']) assert.equal(hasKeyword(text, 'AI'), false, text);
  for (const text of ['AI workshop', 'Try ai!', '(AI)', 'AI-powered']) assert.equal(hasKeyword(text, 'AI'), true, text);
  assert.equal(hasKeyword('machine   learning', 'machine learning'), true);
  assert.equal(hasKeyword('a C++ workshop', 'C++'), true);
  assert.equal(hasKeyword(null, 'AI'), false);
});
test('exact weights and fixed normalization: title +5, description +2, category +3', () => {
  const scored = scoreEvent(event({ title: 'Coding evening', description: 'Try software', category: 'Technology' }), prefs);
  assert.equal(scored.rawScore, 10);
  assert.equal(scored.relevanceScore, 33);
});
test('interest title +4 and description +2 without a major match', () => {
  const scored = scoreEvent(event({ title: 'Robotics', description: 'Try robotics' }), { ...prefs, major: 'Undecided' });
  assert.equal(scored.rawScore, 6);
  assert.equal(scored.relevanceScore, 20);
});
test('repeated keywords, duplicate interests, and AI aliases do not inflate scores', () => {
  const clean = event({ title: 'AI coding', description: 'AI and coding' });
  const repeated = event({ title: 'AI AI artificial intelligence coding coding', description: 'AI artificial intelligence coding coding' });
  const preferences = { ...prefs, interests: ['Artificial Intelligence', 'Artificial Intelligence', 'Technology'] };
  assert.equal(scoreEvent(clean, preferences).rawScore, 14);
  assert.equal(scoreEvent(repeated, preferences).rawScore, 14);
});
test('score is bounded and missing descriptions are safe', () => {
  assert.equal(scoreEvent(event({ title: 'Nothing related', description: undefined }), prefs).relevanceScore, 0);
  assert.equal(scoreEvent(event({ title: 'Python programming coding software cybersecurity AI machine learning hackathon developer', description: 'coding', category: 'Technology' }), prefs).relevanceScore, 100);
});
test('explanation identifies actual major and interest matches', () => {
  const scored = scoreEvent(event({ title: 'Coding with AI' }), { ...prefs, interests: ['Artificial Intelligence'] });
  assert.match(scored.explanation, /Computer Science major/);
  assert.match(scored.explanation, /Artificial Intelligence/);
  assert.match(scoreEvent(event({ title: 'Art walk' }), prefs).explanation, /beyond your current interests/);
});
test('AI input alias is normalized and invalid preferences are rejected', () => {
  assert.deepEqual(normalizePreferences({ ...prefs, interests: ['AI', 'Artificial Intelligence'] }).interests, ['Artificial Intelligence']);
  for (const value of [null, [], { major: 'Unknown' }, { campus: 'Mars' }, { interests: 'AI' }, { interests: ['Unknown'] }]) assert.throws(() => normalizePreferences(value));
});
test('campus filtering supports multiple campuses and retains low relevance events', () => {
  const events = [event(), event({ id: 'two', campus: 'Storrs' }), event({ id: 'three', campuses: ['Stamford', 'Storrs'], campus: 'Stamford, Storrs' })];
  assert.equal(recommendEvents(events, prefs, {}, now).length, 2);
  assert.equal(recommendEvents(events, prefs, { campus: 'All Campuses' }, now).length, 3);
});
test('recommendations sort descending with date tiebreaks', () => {
  const result = recommendEvents([event(), event({ id: 'two', title: 'Coding' }), event({ id: 'three', title: 'Coding', startDate: '2026-10-10T16:00:00Z' })], prefs, {}, now);
  assert.deepEqual(result.map((item) => item.id), ['three', 'two', 'one']);
});
test('search matches descriptions, hosts, category and locations case-insensitively', () => {
  const events = [event({ description: 'Genetics workshop', organization: 'Bio Club', location: 'Library' }), event({ id: 'two', description: undefined })];
  for (const search of ['GENETICS', 'Bio Club', 'Library']) assert.equal(filterEvents(events, { search }, now).length, 1);
  assert.equal(filterEvents(events, { search: 'impossible' }, now).length, 0);
});
test('upcoming includes ongoing events but excludes finished events', () => {
  const events = [event({ id: 'past', startDate: '2026-10-08T01:00:00Z', endDate: '2026-10-08T03:00:00Z' }), event({ id: 'ongoing', startDate: '2026-10-09T12:00:00Z', endDate: '2026-10-09T16:00:00Z' }), event()];
  assert.deepEqual(filterEvents(events, { sort: 'date' }, now).map((item) => item.id), ['ongoing', 'one']);
});
test('today uses Eastern calendar day and date range is bounded', () => {
  const events = [event({ id: 'tonight', startDate: '2026-10-10T01:00:00Z' }), event(), event({ id: 'later', startDate: '2026-10-20T18:00:00Z', endDate: '2026-10-20T20:00:00Z' })];
  assert.deepEqual(filterEvents(events, { date: 'today' }, now).map((item) => item.id), ['tonight']);
  assert.equal(filterEvents(events, { date: 'week' }, now).length, 2);
  assert.equal(filterEvents(events, { date: 'month' }, now).length, 3);
});
test('frontend search, campus, category, and sorting work together', () => {
  const events = [event({ title: 'Coding', relevanceScore: 20 }), event({ id: 'two', title: 'Coding group', relevanceScore: 80 }), event({ id: 'three', title: 'Coding meetup', campus: 'Storrs', relevanceScore: 100 })];
  const filters = { search: 'CODING', campus: 'Stamford', category: 'Networking', date: 'any', sort: 'relevance' };
  assert.deepEqual(clientFilterEvents(events, filters).map((item) => item.id), ['two', 'one']);
  assert.equal(clientFilterEvents(events, { ...filters, search: 'no results' }).length, 0);
});
