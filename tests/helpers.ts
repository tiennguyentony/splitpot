import { createApp } from '../src/app';
import { openDatabase } from '../src/db';
import { FakeClock } from '../src/lib/clock';
import { SequentialIds } from '../src/lib/ids';

// Wednesday 15 April 2026, 12:00 UTC.
export const T0 = new Date('2026-04-15T12:00:00.000Z');

export const ALICE = 'usr_alice';
export const BEA = 'usr_bea';
export const CHEN = 'usr_chen';
export const DAN = 'usr_dan';
export const ERIN = 'usr_erin';

type Body = Record<string, unknown>;

// Fresh in-memory app per test: five users, rates EUR→USD 1.08 and
// GBP→EUR 1.17, and a "Trip" group in EUR with Alice, Bea and Chen.
export function createTestApp() {
  const db = openDatabase(':memory:');
  const clock = new FakeClock(T0);
  const { app, services } = createApp({ db, clock, ids: new SequentialIds(), log: () => {} });

  const users = db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)');
  for (const name of ['alice', 'bea', 'chen', 'dan', 'erin']) {
    users.run(`usr_${name}`, `${name}@example.com`, name[0].toUpperCase() + name.slice(1));
  }
  services.repos.rates.save('EUR', 'USD', '1.08', T0);
  services.repos.rates.save('GBP', 'EUR', '1.17', T0);

  const tokens = new Map<string, string>();
  async function tokenFor(userId: string): Promise<string> {
    if (!tokens.has(userId)) {
      const email = `${userId.replace('usr_', '')}@example.com`;
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      tokens.set(userId, ((await res.json()) as { token: string }).token);
    }
    return tokens.get(userId)!;
  }

  async function call(method: string, path: string, as: string, body?: Body, headers: Record<string, string> = {}) {
    const res = await app.request(path, {
      method,
      headers: { authorization: `Bearer ${await tokenFor(as)}`, 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as any };
  }

  const tripId = services.groups.create(ALICE, { name: 'Trip', baseCurrency: 'EUR' }).group.id;
  services.groups.addMember(ALICE, tripId, 'bea@example.com');
  services.groups.addMember(ALICE, tripId, 'chen@example.com');

  return {
    app,
    db,
    clock,
    services,
    tripId,
    get: (path: string, as: string) => call('GET', path, as),
    post: (path: string, as: string, body: Body, headers?: Record<string, string>) =>
      call('POST', path, as, body, headers),
    put: (path: string, as: string, body: Body) => call('PUT', path, as, body),
    del: (path: string, as: string) => call('DELETE', path, as),
  };
}

export function balancesOf(body: { balances: { memberId: string; balance: string }[] }): Record<string, string> {
  return Object.fromEntries(body.balances.map((b) => [b.memberId, b.balance]));
}
