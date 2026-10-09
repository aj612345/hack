async function request(path, options = {}) {
  let response;
  try { response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('We couldn’t reach the event server. Check your connection and try again.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'We couldn’t load events. Check that the server is running and try again.');
  return data;
}

export const getOptions = async () => {
  const [majors, interests] = await Promise.all([request('/majors'), request('/interests')]);
  return { ...majors, ...interests };
};
export const getRecommendations = (preferences, source, signal) => request('/recommendations', {
  method: 'POST', signal,
  body: JSON.stringify({ ...preferences, source, filters: { campus: 'All Campuses' } }),
});

export function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', ...options }).format(new Date(date));
}
export function filterEvents(events, filters) {
  const search = filters.search.trim().toLowerCase();
  const now = new Date();
  return events.filter((event) => {
    if (filters.campus !== 'All Campuses' && !(event.campuses || [event.campus]).includes(filters.campus)) return false;
    if (filters.category !== 'All categories' && event.category !== filters.category) return false;
    if (search && ![event.title, event.description, event.organization, event.location, event.category].some((value) => (value || '').toLowerCase().includes(search))) return false;
    if (filters.date === 'today' && formatDate(event.startDate) !== formatDate(now)) return false;
    if (filters.date === 'week' && new Date(event.startDate) > new Date(now.getTime() + 7 * 86400000)) return false;
    if (filters.date === 'month' && new Date(event.startDate) > new Date(now.getTime() + 30 * 86400000)) return false;
    return true;
  }).sort((a, b) => filters.sort === 'date' ? new Date(a.startDate) - new Date(b.startDate) : b.relevanceScore - a.relevanceScore || new Date(a.startDate) - new Date(b.startDate));
}
