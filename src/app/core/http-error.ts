import { HttpErrorResponse } from '@angular/common/http';

/**
 * One line of inline text for a failed call. Spring Boot's error bodies carry no message, so
 * this reads the status. Through the dev proxy a stopped backend shows up as a 5xx, not 0.
 */
export function describeHttpError(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) {
    return `${fallback}.`;
  }
  if (err.status === 0) {
    return `${fallback}: no response. Is the dev server (npm start) running?`;
  }
  if (err.status === 403) {
    return `${fallback}: the token lacks the scope this needs (403).`;
  }
  if (err.status >= 500) {
    return `${fallback}: the backend answered ${err.status}. Is docker compose up running?`;
  }
  return `${fallback} (HTTP ${err.status}).`;
}
