import { randomUUID } from 'node:crypto';

export interface IdGenerator {
  next(prefix: string): string;
}

export const uuidIds: IdGenerator = {
  next: (prefix) => `${prefix}_${randomUUID()}`,
};

// Predictable ids for tests: exp_1, exp_2, pay_1, ...
export class SequentialIds implements IdGenerator {
  private counters = new Map<string, number>();

  next(prefix: string): string {
    const n = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, n);
    return `${prefix}_${n}`;
  }
}
