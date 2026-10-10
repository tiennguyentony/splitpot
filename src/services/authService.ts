import { createHash, randomBytes } from 'node:crypto';
import type { Clock } from '../lib/clock';
import { NotFound } from '../lib/errors';
import type { UserRepo, UserRow } from '../repositories/userRepo';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Demo login: email only, no passwords. We store a hash of the token, never
// the token itself.
export class AuthService {
  constructor(private readonly deps: { users: UserRepo; clock: Clock }) {}

  login(email: string): string {
    const user = this.deps.users.findByEmail(email);
    if (!user) throw new NotFound('User');
    const token = randomBytes(24).toString('base64url');
    this.deps.users.createSession(hashToken(token), user.id, this.deps.clock.now());
    return token;
  }

  userForToken(token: string): UserRow | undefined {
    return this.deps.users.findBySessionHash(hashToken(token));
  }
}
