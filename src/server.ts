import { serve } from '@hono/node-server';
import { seed } from '../seed/seed';
import { createApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db';
import { systemClock } from './lib/clock';
import { uuidIds } from './lib/ids';

const config = loadConfig();
const db = openDatabase(config.dbPath);

const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
if (n === 0) {
  seed(db, systemClock);
  console.log('Seeded demo data');
}

const { app } = createApp({ db, clock: systemClock, ids: uuidIds });

serve({ fetch: app.fetch, port: config.port, hostname: '127.0.0.1' }, (info) => {
  console.log(`SplitPot API on http://localhost:${info.port} (database: ${config.dbPath})`);
});
