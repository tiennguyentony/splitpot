import { describe, expect, it } from 'vitest';
import { ALICE, BEA, CHEN, DAN, balancesOf, createTestApp } from '../helpers';

async function withDinner() {
  const ctx = createTestApp();
  await ctx.post(`/groups/${ctx.tripId}/expenses`, ALICE, {
    description: 'Dinner',
    amount: '90.00',
    paidBy: ALICE,
    split: { type: 'equal', members: [ALICE, BEA, CHEN] },
  });
  return ctx;
}

describe('payments', () => {
  it('records a payment and updates balances', async () => {
    const { get, post, tripId } = await withDinner();
    const res = await post(`/groups/${tripId}/payments`, BEA, { from: BEA, to: ALICE, amount: '30.00' });

    expect(res.status).toBe(201);
    expect(res.body.payment).toMatchObject({ from: BEA, to: ALICE, amount: '30.00' });
    const balances = await get(`/groups/${tripId}/balances`, ALICE);
    expect(balancesOf(balances.body)).toEqual({ [ALICE]: '30.00', [BEA]: '0.00', [CHEN]: '-30.00' });
  });

  it('lists payments', async () => {
    const { get, post, tripId } = await withDinner();
    await post(`/groups/${tripId}/payments`, BEA, { from: BEA, to: ALICE, amount: '10.00' });
    const res = await get(`/groups/${tripId}/payments`, CHEN);
    expect(res.body.payments).toHaveLength(1);
  });

  it('refuses a payment to someone outside the group', async () => {
    const { post, tripId } = await withDinner();
    const res = await post(`/groups/${tripId}/payments`, BEA, { from: BEA, to: DAN, amount: '10.00' });
    expect(res.status).toBe(422);
  });

  it('refuses a payment to yourself', async () => {
    const { post, tripId } = await withDinner();
    const res = await post(`/groups/${tripId}/payments`, BEA, { from: BEA, to: BEA, amount: '10.00' });
    expect(res.status).toBe(400);
  });

  it('is only open to members', async () => {
    const { post, tripId } = await withDinner();
    const res = await post(`/groups/${tripId}/payments`, DAN, { from: BEA, to: ALICE, amount: '10.00' });
    expect(res.status).toBe(404);
  });
});

describe('settle up', () => {
  it('suggests who pays whom', async () => {
    const { get, tripId } = await withDinner();
    const res = await get(`/groups/${tripId}/settle-up`, CHEN);
    expect(res.body).toEqual({
      currency: 'EUR',
      transfers: [
        { from: BEA, to: ALICE, amount: '30.00' },
        { from: CHEN, to: ALICE, amount: '30.00' },
      ],
    });
  });

  it('suggests nothing once everyone has paid', async () => {
    const { get, post, tripId } = await withDinner();
    await post(`/groups/${tripId}/payments`, BEA, { from: BEA, to: ALICE, amount: '30.00' });
    await post(`/groups/${tripId}/payments`, CHEN, { from: CHEN, to: ALICE, amount: '30.00' });
    const res = await get(`/groups/${tripId}/settle-up`, ALICE);
    expect(res.body.transfers).toEqual([]);
  });
});
