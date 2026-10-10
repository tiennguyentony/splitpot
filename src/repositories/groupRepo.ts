import type { DatabaseSync } from 'node:sqlite';

export interface GroupRow {
  id: string;
  name: string;
  base_currency: string;
  created_by: string;
  created_at: string;
}

export interface MemberRow {
  user_id: string;
  name: string;
  email: string;
  joined_at: string;
}

export class GroupRepo {
  constructor(private readonly db: DatabaseSync) {}

  insert(group: GroupRow): void {
    this.db
      .prepare('INSERT INTO groups (id, name, base_currency, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(group.id, group.name, group.base_currency, group.created_by, group.created_at);
  }

  findById(id: string): GroupRow | undefined {
    return this.db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as GroupRow | undefined;
  }

  listForUser(userId: string): GroupRow[] {
    return this.db
      .prepare(
        `SELECT g.* FROM groups g
         JOIN group_members m ON m.group_id = g.id
         WHERE m.user_id = ?
         ORDER BY g.created_at`,
      )
      .all(userId) as unknown as GroupRow[];
  }

  addMember(groupId: string, userId: string, now: Date): void {
    this.db
      .prepare('INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)')
      .run(groupId, userId, now.toISOString());
  }

  isMember(groupId: string, userId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);
    return row !== undefined;
  }

  // In the order people joined, which is also the order the API returns them.
  members(groupId: string): MemberRow[] {
    return this.db
      .prepare(
        `SELECT m.user_id, u.name, u.email, m.joined_at FROM group_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.group_id = ?
         ORDER BY m.joined_at, m.user_id`,
      )
      .all(groupId) as unknown as MemberRow[];
  }
}
