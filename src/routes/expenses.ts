import { Hono } from 'hono';
import { z } from 'zod';
import type { Services } from '../app';
import { isDay } from '../lib/dates';
import { toExpenseDto } from './dto';
import type { AppEnv } from './env';
import { CurrencyCode } from './groups';
import { idempotent } from './idempotency';

const Amount = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Use a decimal string like "12.50"');

const Split = z.discriminatedUnion('type', [
  z.object({ type: z.literal('equal'), members: z.array(z.string()).min(1) }),
  z.object({
    type: z.literal('shares'),
    shares: z.array(z.object({ memberId: z.string(), shares: z.number().int().positive() })).min(1),
  }),
  z.object({
    type: z.literal('exact'),
    parts: z.array(z.object({ memberId: z.string(), amount: Amount })).min(1),
  }),
]);

const CreateExpenseBody = z.object({
  description: z.string().trim().min(1).max(140),
  amount: Amount,
  currency: CurrencyCode.optional(),
  paidBy: z.string(),
  spentAt: z.iso.datetime({ offset: true }).optional(),
  split: Split,
});

const Day = z.string().refine(isDay, 'Use YYYY-MM-DD');
const ListQuery = z.object({ from: Day.optional(), to: Day.optional() });

export function expenseRoutes(services: Services) {
  const routes = new Hono<AppEnv>();

  routes.post('/groups/:id/expenses', async (c) => {
    const input = CreateExpenseBody.parse(await c.req.json());
    return idempotent(c, services, 201, () => {
      const expense = services.expenses.create(c.get('user').id, c.req.param('id'), input);
      return { expense: toExpenseDto(expense) };
    });
  });

  routes.get('/groups/:id/expenses', (c) => {
    const filter = ListQuery.parse(c.req.query());
    const expenses = services.expenses.list(c.get('user').id, c.req.param('id'), filter);
    return c.json({ expenses: expenses.map(toExpenseDto) });
  });

  routes.get('/expenses/:id', (c) => {
    return c.json({ expense: toExpenseDto(services.expenses.get(c.get('user').id, c.req.param('id'))) });
  });

  routes.delete('/expenses/:id', (c) => {
    services.expenses.delete(c.get('user').id, c.req.param('id'));
    return c.body(null, 204);
  });

  return routes;
}
