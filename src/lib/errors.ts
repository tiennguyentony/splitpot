// Services throw DomainErrors and never know about HTTP. The error handler in
// app.ts maps each code to a status.
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFound extends DomainError {
  constructor(what: string) {
    super('NOT_FOUND', `${what} not found`);
  }
}

export class Unauthorized extends DomainError {
  constructor() {
    super('UNAUTHORIZED', 'Login required');
  }
}

export class Forbidden extends DomainError {
  constructor(message = 'Not allowed') {
    super('FORBIDDEN', message);
  }
}

export class NotAMember extends DomainError {
  constructor() {
    super('NOT_A_MEMBER', 'Everyone on an expense or payment must be a member of the group');
  }
}

export class InvalidAmount extends DomainError {
  constructor(message: string) {
    super('INVALID_AMOUNT', message);
  }
}

export class MissingRate extends DomainError {
  constructor(from: string, to: string) {
    super('MISSING_RATE', `No exchange rate between ${from} and ${to}`);
  }
}

export const HTTP_STATUS_BY_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_A_MEMBER: 422,
  INVALID_AMOUNT: 422,
  MISSING_RATE: 422,
  ALREADY_MEMBER: 409,
};
