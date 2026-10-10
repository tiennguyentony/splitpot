import { Hono } from 'hono';
import type { DatabaseSync } from 'node:sqlite';
import { ZodError } from 'zod';
import type { Clock } from './lib/clock';
import { DomainError, HTTP_STATUS_BY_CODE } from './lib/errors';
import type { IdGenerator } from './lib/ids';
import { BalanceRepo } from './repositories/balanceRepo';
import { ExpenseRepo } from './repositories/expenseRepo';
import { GroupRepo } from './repositories/groupRepo';
import { IdempotencyRepo } from './repositories/idempotencyRepo';
import { PaymentRepo } from './repositories/paymentRepo';
import { RateRepo } from './repositories/rateRepo';
import { UserRepo } from './repositories/userRepo';
import { authRoutes, requireUser } from './routes/auth';
import type { AppEnv } from './routes/env';
import { expenseRoutes } from './routes/expenses';
import { groupRoutes } from './routes/groups';
import { paymentRoutes } from './routes/payments';
import { rateRoutes } from './routes/rates';
import { AuthService } from './services/authService';
import { BalanceService } from './services/balanceService';
import { ExpenseService } from './services/expenseService';
import { GroupService } from './services/groupService';
import { PaymentService } from './services/paymentService';

export interface AppDeps {
  db: DatabaseSync;
  clock: Clock;
  ids: IdGenerator;
  log?: (message: string) => void;
}

export function buildServices(deps: AppDeps) {
  const { db, clock, ids } = deps;
  const repos = {
    users: new UserRepo(db),
    groups: new GroupRepo(db),
    expenses: new ExpenseRepo(db),
    payments: new PaymentRepo(db),
    rates: new RateRepo(db),
    balances: new BalanceRepo(db),
    idempotency: new IdempotencyRepo(db),
  };
  const auth = new AuthService({ users: repos.users, clock });
  const balances = new BalanceService({
    groups: repos.groups,
    expenses: repos.expenses,
    payments: repos.payments,
    balances: repos.balances,
    clock,
  });
  const groups = new GroupService({ db, groups: repos.groups, users: repos.users, balances, clock, ids });
  const expenses = new ExpenseService({
    db,
    expenses: repos.expenses,
    groups: repos.groups,
    groupService: groups,
    rates: repos.rates,
    balances,
    clock,
    ids,
  });
  const payments = new PaymentService({ db, payments: repos.payments, groupService: groups, balances, clock, ids });
  return { repos, auth, balances, groups, expenses, payments, clock };
}

export type Services = ReturnType<typeof buildServices>;

// Composition root: everything the app depends on is passed in here, so tests
// can swap the clock, ids and database.
export function createApp(deps: AppDeps): { app: Hono<AppEnv>; services: Services } {
  const app = new Hono<AppEnv>();
  const services = buildServices(deps);
  const log = deps.log ?? console.error;

  app.onError((err, c) => {
    if (err instanceof DomainError) {
      const status = (HTTP_STATUS_BY_CODE[err.code] ?? 400) as 400;
      return c.json({ error: { code: err.code, message: err.message } }, status);
    }
    if (err instanceof ZodError) {
      return c.json({ error: { code: 'VALIDATION_FAILED', message: 'Invalid request', issues: err.issues } }, 400);
    }
    if (err instanceof SyntaxError) {
      return c.json({ error: { code: 'INVALID_JSON', message: 'Request body must be JSON' } }, 400);
    }
    log(err.stack ?? String(err));
    return c.json({ error: { code: 'INTERNAL', message: 'Something went wrong' } }, 500);
  });

  const authenticated = requireUser(services.auth);
  for (const path of ['/groups', '/groups/*', '/expenses/*', '/rates', '/rates/*']) {
    app.use(path, authenticated);
  }

  app.get('/health', (c) => c.json({ ok: true }));
  app.route('/', authRoutes(services));
  app.route('/', groupRoutes(services));
  app.route('/', expenseRoutes(services));
  app.route('/', paymentRoutes(services));
  app.route('/', rateRoutes(services));

  return { app, services };
}
