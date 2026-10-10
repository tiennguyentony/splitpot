import { describe, expect, it } from 'vitest';
import { ALICE, BEA, CHEN, DAN, balancesOf, createTestApp } from '../helpers';

describe('groups', () => {
  it('requires login', async () => {
    const { app } = createTestApp();
    const res = await app.request('/groups');
    expect(res.status).toBe(401);
  });

  it('creates a group with the creator as its first member', async () => {
    const { post } = createTestApp();
    const res = await post('/groups', DAN, { name: 'Flat 3B', baseCurrency: 'GBP' });
    expect(res.status).toBe(201);
    expect(res.body.group).toMatchObject({ name: 'Flat 3B', baseCurrency: 'GBP' });
    expect(res.body.group.members.map((m: { id: string }) => m.id)).toEqual([DAN]);
  });

  it('rejects a lowercase or unknown-looking currency code', async () => {
    const { post } = createTestApp();
    const res = await post('/groups', DAN, { name: 'Flat', baseCurrency: 'gbp' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('adds members by email', async () => {
    const { post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/members`, BEA, { email: 'dan@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.group.members.map((m: { id: string }) => m.id)).toEqual([ALICE, BEA, CHEN, DAN]);
  });

  it('refuses to add someone twice', async () => {
    const { post, tripId } = createTestApp();
    const res = await post(`/groups/${tripId}/members`, ALICE, { email: 'bea@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('hides groups from non-members', async () => {
    const { get, post, tripId } = createTestApp();
    expect((await get(`/groups/${tripId}`, DAN)).status).toBe(404);
    expect((await get(`/groups/${tripId}/balances`, DAN)).status).toBe(404);
    expect((await post(`/groups/${tripId}/members`, DAN, { email: 'dan@example.com' })).status).toBe(404);
  });

  it('lists only my groups', async () => {
    const { get, post } = createTestApp();
    await post('/groups', DAN, { name: 'Flat 3B', baseCurrency: 'GBP' });
    const res = await get('/groups', DAN);
    expect(res.body.groups.map((g: { name: string }) => g.name)).toEqual(['Flat 3B']);
  });

  it('starts everyone at zero', async () => {
    const { get, tripId } = createTestApp();
    const res = await get(`/groups/${tripId}/balances`, ALICE);
    expect(res.body.currency).toBe('EUR');
    expect(balancesOf(res.body)).toEqual({ [ALICE]: '0.00', [BEA]: '0.00', [CHEN]: '0.00' });
  });
});
