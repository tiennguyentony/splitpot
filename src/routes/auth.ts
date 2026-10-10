import { Hono, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import type { Services } from '../app';
import { Unauthorized } from '../lib/errors';
import type { AuthService } from '../services/authService';
import type { AppEnv } from './env';

const LoginBody = z.object({ email: z.email() });

export function authRoutes(services: Services) {
  const routes = new Hono<AppEnv>();

  routes.post('/auth/login', async (c) => {
    const { email } = LoginBody.parse(await c.req.json());
    return c.json({ token: services.auth.login(email) });
  });

  return routes;
}

export function requireUser(auth: AuthService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const header = c.req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    const user = token ? auth.userForToken(token) : undefined;
    if (!user) throw new Unauthorized();
    c.set('user', user);
    await next();
  };
}
