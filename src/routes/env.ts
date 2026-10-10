import type { UserRow } from '../repositories/userRepo';

// Values that middleware puts on the Hono context for handlers to read.
export interface AppEnv {
  Variables: {
    user: UserRow;
  };
}
