import { Hono } from 'hono';
import { z } from 'zod';
import type { Services } from '../app';
import type { AppEnv } from './env';
import { CurrencyCode } from './groups';

const RateBody = z.object({
  rate: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, 'Use a decimal string like "1.08"')
    .refine((r) => Number(r) > 0, 'Rate must be positive'),
});

// Rates only affect expenses created after the change: each expense keeps
// the rate it was created with (ADR-003).
export function rateRoutes(services: Services) {
  const routes = new Hono<AppEnv>();

  routes.get('/rates', (c) => {
    const rates = services.repos.rates.list().map((r) => ({
      base: r.base,
      quote: r.quote,
      rate: r.rate,
      updatedAt: r.updated_at,
    }));
    return c.json({ rates });
  });

  // PUT /rates/EUR/USD { "rate": "1.08" } means €1 = $1.08.
  routes.put('/rates/:base/:quote', async (c) => {
    const base = CurrencyCode.parse(c.req.param('base'));
    const quote = CurrencyCode.parse(c.req.param('quote'));
    const { rate } = RateBody.parse(await c.req.json());
    services.repos.rates.save(base, quote, rate, services.clock.now());
    return c.json({ base, quote, rate });
  });

  return routes;
}
