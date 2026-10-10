import type { DatabaseSync } from 'node:sqlite';
import { buildServices } from '../src/app';
import { transaction } from '../src/db';
import type { Clock } from '../src/lib/clock';
import { SequentialIds } from '../src/lib/ids';

const DAY = 86_400_000;

// Demo data: four friends, two groups, a handful of expenses and one payment.
// Everything except users and rates goes through the services, so the
// balances cache is filled the same way it is in production.
export function seed(db: DatabaseSync, clock: Clock): void {
  const services = buildServices({ db, clock, ids: new SequentialIds() });
  const now = clock.now();
  const daysAgo = (n: number) => new Date(now.getTime() - n * DAY).toISOString();

  transaction(db, () => {
    const users = db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)');
    users.run('usr_alice', 'alice@example.com', 'Alice');
    users.run('usr_bea', 'bea@example.com', 'Bea');
    users.run('usr_chen', 'chen@example.com', 'Chen');
    users.run('usr_dan', 'dan@example.com', 'Dan');

    services.repos.rates.save('EUR', 'USD', '1.08', now);
    services.repos.rates.save('GBP', 'EUR', '1.17', now);
    services.repos.rates.save('EUR', 'JPY', '162.5', now);
  });

  // Lisbon trip: Alice, Bea and Chen, euros.
  const lisbon = services.groups.create('usr_alice', { name: 'Lisbon trip', baseCurrency: 'EUR' }).group.id;
  services.groups.addMember('usr_alice', lisbon, 'bea@example.com');
  services.groups.addMember('usr_alice', lisbon, 'chen@example.com');

  services.expenses.create('usr_bea', lisbon, {
    description: 'Airport taxi',
    amount: '54.00',
    currency: 'USD',
    paidBy: 'usr_bea',
    spentAt: daysAgo(4),
    split: { type: 'equal', members: ['usr_alice', 'usr_bea', 'usr_chen'] },
  });
  services.expenses.create('usr_alice', lisbon, {
    description: 'Dinner at Taberna da Rua',
    amount: '100.00',
    paidBy: 'usr_alice',
    spentAt: daysAgo(3),
    split: { type: 'equal', members: ['usr_alice', 'usr_bea', 'usr_chen'] },
  });
  services.expenses.create('usr_chen', lisbon, {
    description: 'Groceries for the flat',
    amount: '45.60',
    paidBy: 'usr_chen',
    spentAt: daysAgo(2),
    split: {
      type: 'shares',
      shares: [
        { memberId: 'usr_alice', shares: 2 },
        { memberId: 'usr_bea', shares: 1 },
        { memberId: 'usr_chen', shares: 1 },
      ],
    },
  });
  services.payments.record('usr_chen', lisbon, {
    from: 'usr_chen',
    to: 'usr_alice',
    amount: '20.00',
    paidAt: daysAgo(1),
  });

  // Flat 3B: Dan and Alice, pounds.
  const flat = services.groups.create('usr_dan', { name: 'Flat 3B', baseCurrency: 'GBP' }).group.id;
  services.groups.addMember('usr_dan', flat, 'alice@example.com');

  services.expenses.create('usr_dan', flat, {
    description: 'Electricity (September)',
    amount: '84.20',
    paidBy: 'usr_dan',
    spentAt: daysAgo(6),
    split: { type: 'equal', members: ['usr_dan', 'usr_alice'] },
  });
  services.expenses.create('usr_dan', flat, {
    description: 'Internet',
    amount: '30.00',
    paidBy: 'usr_dan',
    spentAt: daysAgo(5),
    split: {
      type: 'exact',
      parts: [
        { memberId: 'usr_dan', amount: '12.00' },
        { memberId: 'usr_alice', amount: '18.00' },
      ],
    },
  });
}
