import { Hono } from 'hono';
import { z } from 'zod';
import type { Services } from '../app';
import { toBalanceDto, toGroupDto, toTransferDto } from './dto';
import type { AppEnv } from './env';

export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code like "EUR"');

const CreateGroupBody = z.object({
  name: z.string().trim().min(1).max(80),
  baseCurrency: CurrencyCode,
});

const AddMemberBody = z.object({ email: z.email() });

export function groupRoutes(services: Services) {
  const routes = new Hono<AppEnv>();

  routes.post('/groups', async (c) => {
    const input = CreateGroupBody.parse(await c.req.json());
    const { group, members } = services.groups.create(c.get('user').id, input);
    return c.json({ group: toGroupDto(group, members) }, 201);
  });

  routes.get('/groups', (c) => {
    return c.json({ groups: services.groups.list(c.get('user').id).map((g) => toGroupDto(g)) });
  });

  routes.get('/groups/:id', (c) => {
    const { group, members } = services.groups.get(c.get('user').id, c.req.param('id'));
    return c.json({ group: toGroupDto(group, members) });
  });

  routes.post('/groups/:id/members', async (c) => {
    const { email } = AddMemberBody.parse(await c.req.json());
    const { group, members } = services.groups.addMember(c.get('user').id, c.req.param('id'), email);
    return c.json({ group: toGroupDto(group, members) }, 201);
  });

  routes.get('/groups/:id/balances', (c) => {
    const group = services.groups.requireMember(c.req.param('id'), c.get('user').id);
    return c.json({
      currency: group.base_currency,
      balances: services.balances.forGroup(group.id).map(toBalanceDto),
    });
  });

  routes.get('/groups/:id/settle-up', (c) => {
    const group = services.groups.requireMember(c.req.param('id'), c.get('user').id);
    return c.json({
      currency: group.base_currency,
      transfers: services.balances.settleUp(group.id).map(toTransferDto),
    });
  });

  return routes;
}
