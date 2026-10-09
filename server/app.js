import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import events from './routes/events.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use('/api', events);
app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }));
const client = fileURLToPath(new URL('../client/dist/', import.meta.url));
if (existsSync(client)) app.use(express.static(client));
app.use((error, _request, response, _next) => {
  if (error.type === 'entity.parse.failed') return response.status(400).json({ error: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return response.status(413).json({ error: 'Request body is too large.' });
  console.error(error.message);
  response.status(500).json({ error: 'Events could not be loaded. Please try again.' });
});
