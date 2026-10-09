import { readFileSync } from 'node:fs';
import { campuses, hasKeyword, keywords } from './recommendations.js';

const samples = JSON.parse(readFileSync(new URL('../data/events.json', import.meta.url), 'utf8'));

// Resolve campus wall time to UTC, including daylight saving time.
export function campusDate(day, time) {
  const target = new Date(`${day}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' }).formatToParts(target);
  const offset = parts.find((part) => part.type === 'timeZoneName').value.replace('GMT', '');
  return new Date(`${day}T${time}:00${offset}`).toISOString();
}

export function getDemoEvents(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name) => parts.find((item) => item.type === name).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  return samples.map(({ dayOffset, time, durationHours, ...event }) => {
    const date = new Date(`${today}T12:00:00Z`);
    // Start tomorrow so all 25 fictional events remain available throughout demo day.
    date.setUTCDate(date.getUTCDate() + dayOffset + 1);
    const startDate = campusDate(date.toISOString().slice(0, 10), time);
    return { ...event, startDate, endDate: new Date(new Date(startDate).getTime() + durationHours * 3600000).toISOString() };
  });
}

export function demoCollection(warning) {
  return {
    events: getDemoEvents(),
    meta: {
      mode: 'demo',
      label: 'Demo collection',
      message: 'These 25 events are fictional. Dates roll forward for the demo; no registration is available.',
      fetchedAt: new Date().toISOString(),
      sourceUrl: 'https://events.uconn.edu/',
      ...(warning ? { warning } : {}),
    },
  };
}

export const LIVE_FEED_URL = 'https://events.uconn.edu/live/json/v2/events/response_fields/description,summary,location,group_title,tags,event_types';
const CACHE_MS = 5 * 60 * 1000;

export function plainText(value) {
  if (typeof value !== 'string') return '';
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…' };
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|li)>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, key) => {
      if (key[0] !== '#') return entities[key] ?? match;
      const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}

function categorize(text, types) {
  if (/art|performance|music/i.test(types)) return 'Arts';
  if (/athletic|sport/i.test(types)) return 'Sports';
  if (/volunteer|service/i.test(types)) return 'Community Service';
  let category = 'Campus Life', best = 0;
  for (const [interest, words] of Object.entries(keywords.interests)) {
    const score = words.filter((word) => hasKeyword(text, word)).length;
    if (score > best) { best = score; category = interest; }
  }
  return category;
}

export function normalizeLiveEvent(item) {
  if (!item || typeof item !== 'object' || item.is_canceled || !item.id || !item.title || typeof item.date_iso !== 'string') return null;
  const start = new Date(item.date_iso);
  if (Number.isNaN(start.getTime())) return null;
  const title = plainText(item.title);
  const description = [plainText(item.summary), plainText(item.description)].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join('\n\n');
  const campusTags = Array.isArray(item.event_types_campus) ? item.event_types_campus.map(plainText) : [];
  const knownCampuses = campuses.filter((campus) => campus !== 'All Campuses' && campusTags.some((tag) => hasKeyword(tag, campus)));
  const inferredCampus = campuses.find((campus) => campus !== 'All Campuses' && hasKeyword(`${item.location || ''} ${item.group_title || ''}`, campus));
  const eventCampuses = knownCampuses.length ? knownCampuses : inferredCampus ? [inferredCampus] : campusTags;
  let url = null;
  try { const parsed = new URL(item.url); if (['https:', 'http:'].includes(parsed.protocol)) url = parsed.href; } catch { /* Missing or unsafe links stay absent. */ }
  const allDay = Boolean(item.is_all_day);
  let endDate = item.date2_iso && !Number.isNaN(new Date(item.date2_iso).getTime()) ? new Date(item.date2_iso).toISOString() : null;
  if (allDay && !endDate) {
    const nextDay = new Date(`${item.date_iso.slice(0, 10)}T12:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    endDate = campusDate(nextDay.toISOString().slice(0, 10), '00:00');
  }
  return {
    id: `uconn-${item.id}-${start.toISOString()}`, title, description, startDate: start.toISOString(), endDate,
    campus: eventCampuses.join(', ') || (item.is_online ? 'Online' : 'Campus not listed'), campuses: eventCampuses,
    category: categorize(`${title} ${description} ${(item.tags || []).join(' ')}`, (item.event_types || []).join(' ')),
    location: plainText(item.location_title || item.location) || (item.is_online ? 'Online' : 'See original event'),
    organization: plainText(item.group_title) || 'UConn Calendar',
    url, allDay, isDemo: false, source: 'UConn Events Calendar', featured: Boolean(item.is_starred),
  };
}

// Injectable fetch makes provider behavior testable without network calls.
export function createLiveProvider(fetcher = fetch) {
  let cached = null, inflight = null;
  async function load() {
    const events = new Map();
    let totalAvailable = 0, pagesFetched = 0;
    for (let page = 1; page <= 3; page++) {
      const response = await fetcher(`${LIVE_FEED_URL}?page=${page}`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' }, redirect: 'error' });
      if (!response.ok) throw new Error(`UConn calendar returned HTTP ${response.status}.`);
      const payload = await response.json();
      if (!Array.isArray(payload.data)) throw new Error('Unexpected UConn calendar format.');
      totalAvailable = payload.meta?.total_results || payload.data.length;
      pagesFetched++;
      for (const item of payload.data) {
        const event = normalizeLiveEvent(item);
        if (event) events.set(event.id, event);
      }
      if (!payload.links?.next) break;
    }
    if (!events.size) throw new Error('No public events were returned.');
    const result = {
      events: [...events.values()],
      meta: { mode: 'live', label: 'Live UConn calendar', message: 'Public UConn calendar listings. Always confirm details and eligibility on the original event page.', sourceUrl: LIVE_FEED_URL, fetchedAt: new Date().toISOString(), totalAvailable, pagesFetched, limited: totalAvailable > events.size },
    };
    cached = { result, expires: Date.now() + CACHE_MS };
    return result;
  }
  return async () => {
    if (cached && cached.expires > Date.now()) return cached.result;
    if (!inflight) inflight = load().finally(() => { inflight = null; });
    try { return await inflight; }
    catch {
      // Cache failure briefly to avoid hammering an unavailable public service.
      const result = demoCollection('The live UConn feed is unavailable. You’re viewing clearly labeled fictional demo events instead. Try live events again shortly.');
      cached = { result, expires: Date.now() + 30000 };
      return result;
    }
  };
}

const liveProvider = createLiveProvider();
export async function getEvents(source = 'demo') {
  return source === 'live' ? liveProvider() : demoCollection();
}
