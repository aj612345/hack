import { Router } from 'express';
import { getEvents } from '../services/eventProvider.js';
import { campuses, filterEvents, interests, majors, normalizePreferences, recommendEvents } from '../services/recommendations.js';

const router = Router();
router.get('/health', (_request, response) => response.json({ status: 'ok', service: 'HuskyConnect', timestamp: new Date().toISOString() }));
router.get('/majors', (_request, response) => response.json({ majors, campuses }));
router.get('/interests', (_request, response) => response.json({ interests }));

function validateFilters(filters = {}) {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) throw new Error('Filters must be an object.');
  for (const name of ['campus', 'category', 'date', 'sort', 'search']) {
    if (filters[name] !== undefined && typeof filters[name] !== 'string') throw new Error(`${name} must be text.`);
  }
  if (filters.campus && !campuses.includes(filters.campus)) throw new Error('Choose a supported campus.');
  if (filters.category && !['All categories', 'Campus Life', ...interests].includes(filters.category)) throw new Error('Choose a supported category.');
  if (filters.date && !['any', 'today', 'week', 'month'].includes(filters.date)) throw new Error('Choose a supported date filter.');
  if (filters.sort && !['date', 'relevance'].includes(filters.sort)) throw new Error('Choose date or relevance sorting.');
  if (filters.search?.length > 200) throw new Error('Search must be 200 characters or fewer.');
  return filters;
}

router.get('/events', async (request, response) => {
  let filters;
  try { validateSource(request.query.source); filters = validateFilters(request.query); }
  catch (error) { return response.status(400).json({ error: error.message }); }
  const { events, meta } = await getEvents(request.query.source);
  response.json({ events: filterEvents(events, { sort: 'date', ...filters }), meta });
});

router.post('/recommendations', async (request, response) => {
  let preferences, filters;
  try {
    preferences = normalizePreferences(request.body);
    validateSource(request.body.source);
    filters = validateFilters(request.body.filters);
  } catch (error) { return response.status(400).json({ error: error.message }); }
  const { events, meta } = await getEvents(request.body.source);
  response.json({ events: recommendEvents(events, preferences, filters), meta, preferences });
});

function validateSource(source) {
  if (source !== undefined && !['demo', 'live'].includes(source)) throw new Error('Choose demo or live as the event source.');
}

export default router;
