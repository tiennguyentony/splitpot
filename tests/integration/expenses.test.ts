import { describe, expect, it } from 'vitest';
import { ALICE, BEA, CHEN, DAN, balancesOf, createTestApp } from '../helpers';

const dinner = {
  description: 'Dinner',
  amount: '90.00',
  paidBy: ALICE,
  split: { type: 'equal', members: [ALICE, BEA, CHEN] },
};

describe('creating expenses', () => {
  it('splits equally and updates balances', async () => {
    const { get, post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/expenses`, ALICE, dinner);

    expect(res.status).toBe(201);
    expect(res.body.expense).toMatchObject({
      description: 'Dinner',
      amount: '90.00',
      currency: 'EUR',
      baseAmount: '90.00',
      shares: [
        { memberId: ALICE, amount: '30.00' },
        { memberId: BEA, amount: '30.00' },
        { memberId: CHEN, amount: '30.00' },
      ],
    });

    const balances = await get(`/groups/${tripId}/balances`, BEA);
    expect(balancesOf(balances.body)).toEqual({ [ALICE]: '60.00', [BEA]: '-30.00', [CHEN]: '-30.00' });
  });

  it('splits by shares', async () => {
    const { post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/expenses`, CHEN, {
      description: 'Groceries',
      amount: '45.60',
      paidBy: CHEN,
      split: {
        type: 'shares',
        shares: [
          { memberId: ALICE, shares: 2 },
          { memberId: BEA, shares: 1 },
          { memberId: CHEN, shares: 1 },
        ],
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.expense.shares.map((s: { amount: string }) => s.amount)).toEqual(['22.80', '11.40', '11.40']);
  });

  it('accepts exact amounts', async () => {
    const { post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/expenses`, BEA, {
      description: 'Museum tickets',
      amount: '30.00',
      paidBy: BEA,
      split: {
        type: 'exact',
        parts: [
          { memberId: BEA, amount: '12.00' },
          { memberId: CHEN, amount: '18.00' },
        ],
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.expense.shares).toEqual([
      { memberId: BEA, amount: '12.00' },
      { memberId: CHEN, amount: '18.00' },
    ]);
  });

  it('converts foreign currency to the group currency and keeps the rate', async () => {
    const { post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/expenses`, ALICE, {
      ...dinner,
      description: 'London pub',
      amount: '30.00',
      currency: 'GBP',
    });
    expect(res.status).toBe(201);
    expect(res.body.expense).toMatchObject({ amount: '30.00', currency: 'GBP', baseAmount: '35.10', rate: '1.170000' });
    expect(res.body.expense.shares.map((s: { amount: string }) => s.amount)).toEqual(['11.70', '11.70', '11.70']);
  });

  it('refuses a payer who is not in the group', async () => {
    const { post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/expenses`, ALICE, { ...dinner, paidBy: DAN });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NOT_A_MEMBER');
  });

  it('refuses a share for someone who is not in the group', async () => {
    const { get, post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/expenses`, ALICE, {
      ...dinner,
      split: { type: 'equal', members: [ALICE, DAN] },
    });
    expect(res.status).toBe(422);
    expect((await get(`/groups/${tripId}/expenses`, ALICE)).body.expenses).toEqual([]);
  });

  it('rejects amounts with more than two decimals', async () => {
    const { post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/expenses`, ALICE, { ...dinner, amount: '10.005' });
    expect(res.status).toBe(400);
  });

  it('returns the original expense when a request is retried with the same key', async () => {
    const { get, post, tripId } = createTestApp();
    const headers = { 'idempotency-key': 'dinner-1' };
    const first = await post(`/groups/${tripId}/expenses`, ALICE, dinner, headers);
    const retry = await post(`/groups/${tripId}/expenses`, ALICE, dinner, headers);

    expect(retry.status).toBe(201);
    expect(retry.body.expense.id).toBe(first.body.expense.id);
    expect((await get(`/groups/${tripId}/expenses`, ALICE)).body.expenses).toHaveLength(1);
  });
});

describe('listing expenses', () => {
  it('filters by day', async () => {
    const { get, post, tripId } = createTestApp();
    for (const [description, spentAt] of [
      ['Before', '2026-04-09T12:00:00Z'],
      ['Inside', '2026-04-11T12:00:00Z'],
      ['After', '2026-04-14T12:00:00Z'],
    ]) {
      await post(`/groups/${tripId}/expenses`, ALICE, { ...dinner, description, spentAt });
    }
    const res = await get(`/groups/${tripId}/expenses?from=2026-04-10&to=2026-04-12`, ALICE);
    expect(res.body.expenses.map((e: { description: string }) => e.description)).toEqual(['Inside']);
  });

  it('rejects a malformed day', async () => {
    const { get, tripId } = createTestApp();
    expect((await get(`/groups/${tripId}/expenses?from=10-04-2026`, ALICE)).status).toBe(400);
  });

  it('hides expenses from non-members', async () => {
    const { get, tripId } = createTestApp();
    expect((await get(`/groups/${tripId}/expenses`, DAN)).status).toBe(404);
  });
});

describe('deleting expenses', () => {
  it('removes the expense', async () => {
    const { del, get, post, tripId } = createTestApp();
    const id = (await post(`/groups/${tripId}/expenses`, ALICE, dinner)).body.expense.id;

    expect((await del(`/expenses/${id}`, ALICE)).status).toBe(204);
    expect((await get(`/expenses/${id}`, ALICE)).status).toBe(404);
    expect((await get(`/groups/${tripId}/expenses`, ALICE)).body.expenses).toEqual([]);
  });

  it('only lets the payer or the creator delete', async () => {
    const { del, post, tripId } = createTestApp();
    const id = (await post(`/groups/${tripId}/expenses`, ALICE, dinner)).body.expense.id;
    const res = await del(`/expenses/${id}`, BEA);
    expect(res.status).toBe(403);
  });
});
