import { HttpErrorResponse } from '@angular/common/http';
import { describeHttpError } from './http-error';

describe('describeHttpError', () => {
  it.each([
    [0, 'Is the dev server (npm start) running?'],
    [403, 'lacks the scope'],
    [500, 'Is docker compose up running?'],
    [504, 'Is docker compose up running?'],
    [400, 'Load failed (HTTP 400).'],
  ])('describes status %i', (status, expected) => {
    const message = describeHttpError(new HttpErrorResponse({ status }), 'Load failed');
    expect(message).toContain(expected);
  });

  it('falls back for anything that is not an HTTP failure', () => {
    expect(describeHttpError(new Error('boom'), 'Load failed')).toBe('Load failed.');
  });
});
