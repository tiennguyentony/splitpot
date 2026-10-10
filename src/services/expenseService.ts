import type { DatabaseSync } from 'node:sqlite';
import { convert } from '../domain/currency';
import { computeShares, rebaseShares, type SplitInput } from '../domain/split';
import { isForeignKeyViolation, transaction } from '../db';
import type { Clock } from '../lib/clock';
import { addDays, startOfDay } from '../lib/dates';
import { Forbidden, NotAMember, NotFound } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import { parseCents } from '../lib/money';
import type { ExpenseRepo, ExpenseWithShares } from '../repositories/expenseRepo';
import type { GroupRepo } from '../repositories/groupRepo';
import type { RateRepo } from '../repositories/rateRepo';
import type { BalanceService } from './balanceService';
import type { GroupService } from './groupService';

// What the API accepts. Amounts are decimal strings in the expense currency.
export type SplitRequest =
  | { type: 'equal'; members: string[] }
  | { type: 'shares'; shares: { memberId: string; shares: number }[] }
  | { type: 'exact'; parts: { memberId: string; amount: string }[] };

export interface NewExpense {
  description: string;
  amount: string;
  currency?: string;
  paidBy: string;
  spentAt?: string;
  split: SplitRequest;
}

export class ExpenseService {
  constructor(
    private readonly deps: {
      db: DatabaseSync;
      expenses: ExpenseRepo;
      groups: GroupRepo;
      groupService: GroupService;
      rates: RateRepo;
      balances: BalanceService;
      clock: Clock;
      ids: IdGenerator;
    },
  ) {}

  create(userId: string, groupId: string, input: NewExpense): ExpenseWithShares {
    const group = this.deps.groups.findById(groupId);
    if (!group) throw new NotFound('Group');

    const amountCents = parseCents(input.amount);
    const currency = input.currency ?? group.base_currency;
    const conversion = convert(amountCents, currency, group.base_currency, this.deps.rates);

    let shares = computeShares(amountCents, toSplitInput(input.split));
    if (currency !== group.base_currency) {
      shares = rebaseShares(shares, conversion.cents);
    }

    const now = this.deps.clock.now();
    const id = this.deps.ids.next('exp');
    try {
      transaction(this.deps.db, () => {
        this.deps.expenses.insert(
          {
            id,
            group_id: groupId,
            paid_by: input.paidBy,
            description: input.description,
            amount_cents: amountCents,
            currency,
            base_amount_cents: conversion.cents,
            rate: conversion.rate.toFixed(6),
            split_type: input.split.type,
            spent_at: input.spentAt ? new Date(input.spentAt).toISOString() : now.toISOString(),
            created_by: userId,
            created_at: now.toISOString(),
          },
          shares,
        );
        this.deps.balances.recompute(groupId);
      });
    } catch (err) {
      if (isForeignKeyViolation(err)) throw new NotAMember();
      throw err;
    }
    return this.deps.expenses.findById(id)!;
  }

  // `from` and `to` are calendar days (YYYY-MM-DD), both inclusive.
  list(userId: string, groupId: string, filter: { from?: string; to?: string } = {}): ExpenseWithShares[] {
    this.deps.groupService.requireMember(groupId, userId);
    return this.deps.expenses.listByGroup(groupId, {
      from: filter.from ? startOfDay(filter.from) : undefined,
      to: filter.to ? addDays(startOfDay(filter.to), 1) : undefined,
    });
  }

  get(userId: string, expenseId: string): ExpenseWithShares {
    const expense = this.deps.expenses.findById(expenseId);
    if (!expense) throw new NotFound('Expense');
    this.deps.groupService.requireMember(expense.group_id, userId);
    return expense;
  }

  // The person who added the expense or the person who paid can delete it.
  delete(userId: string, expenseId: string): void {
    const expense = this.get(userId, expenseId);
    if (expense.created_by !== userId && expense.paid_by !== userId) {
      throw new Forbidden('Only the payer or the person who added an expense can delete it');
    }
    this.deps.expenses.softDelete(expenseId, this.deps.clock.now());
  }
}

function toSplitInput(split: SplitRequest): SplitInput {
  if (split.type !== 'exact') return split;
  return {
    type: 'exact',
    parts: split.parts.map((p) => ({ memberId: p.memberId, amountCents: parseCents(p.amount) })),
  };
}
