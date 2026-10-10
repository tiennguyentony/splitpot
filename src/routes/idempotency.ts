import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Services } from '../app';
import type { AppEnv } from './env';

// Mobile clients retry a POST when the connection drops, sending the same
// Idempotency-Key header. If we've seen the key, replay the saved response
// instead of creating the record a second time.
export function idempotent(
  c: Context<AppEnv>,
  services: Services,
  status: ContentfulStatusCode,
  create: () => object,
): Response {
  const key = c.req.header('idempotency-key');
  const userId = c.get('user').id;

  if (key) {
    const saved = services.repos.idempotency.find(userId, key);
    if (saved) return c.json(saved.body as object, saved.status as ContentfulStatusCode);
  }

  const body = create();
  if (key) services.repos.idempotency.save(userId, key, { status, body }, services.clock.now());
  return c.json(body, status);
}
