import { ZodError, ZodType } from 'zod';

export function isPotentialError(e: unknown): boolean {
  return Boolean(
    e instanceof Error ||
      typeof e === 'string' ||
      (typeof e === 'object' &&
        e !== null &&
        (('message' in e && typeof e.message === 'string') ||
          ('details' in e && typeof e.details === 'string') ||
          ('message' in e && typeof e.message === 'string'))),
  );
}

export function getError(e: unknown): string {
  const error = 'An unknown error occurred';

  if (!isPotentialError(e)) return error;
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message.toString();

  if (typeof e === 'object' && e !== null) {
    if ('message' in e && typeof e.message === 'string') return e.message;
    if ('details' in e && typeof e.details === 'string') return e.details;
    if ('error' in e && typeof e.error === 'string') return e.error;
  }

  return error;
}

type SuccessResult<T> = {
  data: T;
  errors: null;
};

type FailureResult = {
  data: null;
  errors: string[];
};

export function validateSchema<T>(
  input: any,
  schema: ZodType<any, any>,
): SuccessResult<T> | FailureResult {
  try {
    console.log('input', input);
    const data = schema.parse(input) as T;
    return { data, errors: null };
  } catch (e) {
    if (e instanceof ZodError) {
      const errors = e.errors.map(
        (issue: any) => `${issue.path.join('.')} is ${issue.message}`,
      );
      return { data: null, errors };
    }

    const errorMessage = getError(e);
    return { data: null, errors: [errorMessage] };
  }
}
