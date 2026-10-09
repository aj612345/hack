import { app } from './app.js';

const port = Number(process.env.PORT) || 3001;
const server = app.listen(port, '127.0.0.1', () => console.log(`HuskyConnect API ready at http://127.0.0.1:${port}`));
server.on('error', (error) => { console.error(`Server failed: ${error.message}`); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
