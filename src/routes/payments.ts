import { Hono } from 'hono';
import { z } from 'zod';
import type { Services } from '../app';
import { toPaymentDto } from './dto';
import type { AppEnv } from './env';

const CreatePaymentBody = z
  .object({
    from: z.string(),
    to: z.string(),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Use a decimal string like "12.50"'),
    paidAt: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((p) => p.from !== p.to, { message: 'A member cannot pay themselves', path: ['to'] });

export function paymentRoutes(services: Services) {
  const routes = new Hono<AppEnv>();

  routes.post('/groups/:id/payments', async (c) => {
    const input = CreatePaymentBody.parse(await c.req.json());
    const payment = services.payments.record(c.get('user').id, c.req.param('id'), input);
    return c.json({ payment: toPaymentDto(payment) }, 201);
  });

  routes.get('/groups/:id/payments', (c) => {
    const payments = services.payments.list(c.get('user').id, c.req.param('id'));
    return c.json({ payments: payments.map(toPaymentDto) });
  });

  return routes;
}
