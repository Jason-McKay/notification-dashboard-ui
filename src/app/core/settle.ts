import { catchError, map, Observable, of } from 'rxjs';

export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Turns a failed load into a value, so one bad poll does not complete the polling stream it
 * runs inside.
 */
export function settle<T>(source: Observable<T>): Observable<Settled<T>> {
  return source.pipe(
    map((value): Settled<T> => ({ ok: true, value })),
    catchError((error: unknown) => of<Settled<T>>({ ok: false, error })),
  );
}
