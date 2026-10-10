import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../db';
import type { Clock } from '../lib/clock';
import { DomainError, NotFound } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import type { GroupRepo, GroupRow, MemberRow } from '../repositories/groupRepo';
import type { UserRepo } from '../repositories/userRepo';
import type { BalanceService } from './balanceService';

export interface GroupDetails {
  group: GroupRow;
  members: MemberRow[];
}

export class GroupService {
  constructor(
    private readonly deps: {
      db: DatabaseSync;
      groups: GroupRepo;
      users: UserRepo;
      balances: BalanceService;
      clock: Clock;
      ids: IdGenerator;
    },
  ) {}

  create(userId: string, input: { name: string; baseCurrency: string }): GroupDetails {
    const now = this.deps.clock.now();
    const group: GroupRow = {
      id: this.deps.ids.next('grp'),
      name: input.name,
      base_currency: input.baseCurrency,
      created_by: userId,
      created_at: now.toISOString(),
    };
    transaction(this.deps.db, () => {
      this.deps.groups.insert(group);
      this.deps.groups.addMember(group.id, userId, now);
      this.deps.balances.recompute(group.id);
    });
    return this.get(userId, group.id);
  }

  list(userId: string): GroupRow[] {
    return this.deps.groups.listForUser(userId);
  }

  get(userId: string, groupId: string): GroupDetails {
    const group = this.requireMember(groupId, userId);
    return { group, members: this.deps.groups.members(groupId) };
  }

  addMember(userId: string, groupId: string, email: string): GroupDetails {
    this.requireMember(groupId, userId);
    const newMember = this.deps.users.findByEmail(email);
    if (!newMember) throw new NotFound('User');
    if (this.deps.groups.isMember(groupId, newMember.id)) {
      throw new DomainError('ALREADY_MEMBER', `${email} is already in this group`);
    }
    transaction(this.deps.db, () => {
      this.deps.groups.addMember(groupId, newMember.id, this.deps.clock.now());
      this.deps.balances.recompute(groupId);
    });
    return this.get(userId, groupId);
  }

  // Non-members get a 404, not a 403, so group ids can't be probed.
  requireMember(groupId: string, userId: string): GroupRow {
    const group = this.deps.groups.findById(groupId);
    if (!group || !this.deps.groups.isMember(groupId, userId)) throw new NotFound('Group');
    return group;
  }
}
