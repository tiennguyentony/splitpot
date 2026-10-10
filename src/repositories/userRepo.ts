import type { DatabaseSync } from 'node:sqlite';

export interface UserRow {
  id: string;
  email: string;
  name: string;
}

export class UserRepo {
  constructor(private readonly db: DatabaseSync) {}

  findById(id: string): UserRow | undefined {
    return this.db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(id) as UserRow | undefined;
  }

  findByEmail(email: string): UserRow | undefined {
    return this.db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email.toLowerCase()) as
      | UserRow
      | undefined;
  }

  createSession(tokenHash: string, userId: string, now: Date): void {
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)')
      .run(tokenHash, userId, now.toISOString());
  }

  findBySessionHash(tokenHash: string): UserRow | undefined {
    return this.db
      .prepare(
        `SELECT u.id, u.email, u.name FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
      )
      .get(tokenHash) as UserRow | undefined;
  }
}
