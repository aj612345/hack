import { readFileSync } from 'node:fs';

export const keywords = JSON.parse(readFileSync(new URL('../data/keywords.json', import.meta.url), 'utf8'));
export const campuses = ['Stamford', 'Storrs', 'Hartford', 'Avery Point', 'Waterbury', 'All Campuses'];
export const majors = Object.keys(keywords.majors);
export const interests = Object.keys(keywords.interests);

export function normalizePreferences(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Preferences must be an object.');
  const major = input.major ?? 'Undecided';
  const campus = input.campus ?? 'All Campuses';
  const selected = input.interests ?? [];
  if (!majors.includes(major)) throw new Error('Choose a supported major.');
  if (!campuses.includes(campus)) throw new Error('Choose a supported campus.');
  if (!Array.isArray(selected) || selected.some((item) => typeof item !== 'string')) throw new Error('Interests must be an array of names.');
  const normalized = [...new Set(selected.map((item) => item === 'AI' ? 'Artificial Intelligence' : item))];
  if (normalized.some((item) => !interests.includes(item))) throw new Error('Choose supported interests.');
  return { major, campus, interests: normalized };
}

const canonical = (word) => word.toLowerCase() === 'artificial intelligence' ? 'ai' : word.toLowerCase();

export function hasKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'iu').test(text || '');
}

export function scoreEvent(event, preferences) {
  const matches = new Map();
  const matchedInterests = new Set();
  let majorMatch = false;
  function record(list, kind, interest) {
    for (const keyword of list) {
      for (const field of ['title', 'description']) {
        if (!hasKeyword(event[field], keyword)) continue;
        const key = `${field}:${canonical(keyword)}`;
        const weight = field === 'description' ? 2 : kind === 'major' ? 5 : 4;
        matches.set(key, Math.max(matches.get(key) || 0, weight));
        if (kind === 'major') majorMatch = true;
        else matchedInterests.add(interest);
      }
    }
  }
  record(keywords.majors[preferences.major] || [], 'major');
  for (const interest of new Set(preferences.interests || [])) record(keywords.interests[interest] || [], 'interest', interest);
  const categoryMatch = preferences.interests.includes(event.category);
  if (categoryMatch) matchedInterests.add(event.category);
  const rawScore = [...matches.values()].reduce((sum, value) => sum + value, 0) + (categoryMatch ? 3 : 0);
  const reasons = [];
  if (majorMatch) reasons.push(`your ${preferences.major} major`);
  if (matchedInterests.size) reasons.push(`your interest in ${[...matchedInterests].join(', ')}`);
  return {
    ...event,
    relevanceScore: Math.min(100, Math.round(rawScore / 30 * 100)),
    rawScore,
    explanation: reasons.length ? `Recommended because this event matches ${reasons.join(' and ')}.` : 'Something new to explore beyond your current interests.',
    matchedInterests: [...matchedInterests],
    majorMatch,
  };
}

export function filterEvents(events, filters = {}, now = new Date()) {
  let result = events.filter((event) => new Date(event.endDate || event.startDate) >= now);
  if (filters.campus && filters.campus !== 'All Campuses') result = result.filter((event) => (event.campuses || [event.campus]).includes(filters.campus));
  if (filters.category && filters.category !== 'All categories') result = result.filter((event) => event.category === filters.category);
  const query = (filters.search || '').trim().toLowerCase();
  if (query) result = result.filter((event) => [event.title, event.description, event.organization, event.location, event.category].some((value) => (value || '').toLowerCase().includes(query)));
  if (filters.date === 'today') {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    result = result.filter((event) => day.format(new Date(event.startDate)) === day.format(now));
  } else if (['week', 'month'].includes(filters.date)) {
    const end = new Date(now.getTime() + (filters.date === 'week' ? 7 : 30) * 86400000);
    result = result.filter((event) => new Date(event.startDate) <= end);
  }
  return [...result].sort((a, b) => filters.sort === 'date'
    ? new Date(a.startDate) - new Date(b.startDate) || a.id.localeCompare(b.id)
    : (b.relevanceScore || 0) - (a.relevanceScore || 0) || new Date(a.startDate) - new Date(b.startDate) || a.id.localeCompare(b.id));
}

export function recommendEvents(events, preferences, filters = {}, now = new Date()) {
  const normalized = normalizePreferences(preferences);
  return filterEvents(events.map((event) => scoreEvent(event, normalized)), { campus: normalized.campus, ...filters }, now);
}
