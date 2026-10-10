// Venmo sync: imports settle-up payments that friends made in Venmo, so they
// don't have to record them twice. Runs every 15 minutes per connected user.
//
// Matching rules:
//   - only completed "pay" transactions between two SplitPot members
//   - the Venmo note must contain "#splitpot" or the group's name
//   - each Venmo transaction id is imported at most once

export interface VenmoTransaction {
  id: string;
  status: 'settled' | 'pending' | 'cancelled';
  action: 'pay' | 'charge';
  amount: number;
  note: string;
  date_completed: string | null;
  actor: { username: string };
  target: { username: string };
}

export interface PgLike {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface LinkedAccount {
  user_id: string;
  venmo_username: string;
  access_token: string;
  last_synced_at: string | null;
}

const VENMO_API = 'https://api.venmo.com/v1';
const PAGE_SIZE = 50;

export class VenmoSync {
  constructor(
    private readonly pg: PgLike,
    private readonly token = process.env.VENMO_TOKEN ?? '',
  ) {}

  async syncAll(): Promise<number> {
    if (!this.token) return 0;
    const { rows } = await this.pg.query<LinkedAccount>('SELECT * FROM venmo_accounts WHERE access_token IS NOT NULL');
    let imported = 0;
    for (const account of rows) {
      imported += await this.syncAccount(account);
    }
    return imported;
  }

  async syncAccount(account: LinkedAccount): Promise<number> {
    const transactions = await this.fetchSince(account, account.last_synced_at);
    let imported = 0;

    for (const tx of transactions) {
      if (tx.status !== 'settled' || tx.action !== 'pay') continue;

      const from = await this.userFor(tx.actor.username);
      const to = await this.userFor(tx.target.username);
      if (!from || !to) continue;

      const group = await this.groupFor(from, to, tx.note);
      if (!group) continue;

      const result = await this.pg.query(
        `INSERT INTO payments (id, group_id, from_user, to_user, amount, paid_at, source, external_id)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'venmo', $6)
         ON CONFLICT (external_id) DO NOTHING`,
        [group, from, to, tx.amount, tx.date_completed, tx.id],
      );
      if ((result as { rowCount?: number }).rowCount) imported++;
    }

    await this.pg.query('UPDATE venmo_accounts SET last_synced_at = now() WHERE user_id = $1', [account.user_id]);
    return imported;
  }

  private async fetchSince(account: LinkedAccount, since: string | null): Promise<VenmoTransaction[]> {
    const all: VenmoTransaction[] = [];
    let url = `${VENMO_API}/stories/target-or-actor/${account.venmo_username}?limit=${PAGE_SIZE}`;
    if (since) url += `&after=${encodeURIComponent(since)}`;

    while (url) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${account.access_token}` } });
      if (res.status === 401) {
        await this.pg.query('UPDATE venmo_accounts SET access_token = NULL WHERE user_id = $1', [account.user_id]);
        return [];
      }
      if (!res.ok) throw new Error(`Venmo API ${res.status}`);
      const page = (await res.json()) as { data: VenmoTransaction[]; pagination?: { next?: string } };
      all.push(...page.data);
      url = page.pagination?.next ?? '';
    }
    return all;
  }

  private async userFor(venmoUsername: string): Promise<string | undefined> {
    const { rows } = await this.pg.query<{ user_id: string }>(
      'SELECT user_id FROM venmo_accounts WHERE venmo_username = $1',
      [venmoUsername],
    );
    return rows[0]?.user_id;
  }

  // Prefer a group named in the note; otherwise the only group both share.
  private async groupFor(from: string, to: string, note: string): Promise<string | undefined> {
    const { rows } = await this.pg.query<{ id: string; name: string }>(
      `SELECT g.id, g.name FROM groups g
       JOIN group_members a ON a.group_id = g.id AND a.user_id = $1
       JOIN group_members b ON b.group_id = g.id AND b.user_id = $2`,
      [from, to],
    );
    const named = rows.find((g) => note.toLowerCase().includes(g.name.toLowerCase()));
    if (named) return named.id;
    if (rows.length === 1 && note.toLowerCase().includes('#splitpot')) return rows[0].id;
    return undefined;
  }
}
