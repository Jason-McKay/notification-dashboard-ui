import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API, WORKER } from './api-paths';
import { AuthService, TOKEN_URL } from './auth.service';

const isBackendUrl = (url: string) => url.startsWith(`${API}/`) || url.startsWith(`${WORKER}/`);

/**
 * Adds the bearer token to backend calls. A 401 means the token expired (they last an hour):
 * drop it and go back to the login screen. The token call itself is left alone, so a wrong
 * secret is reported by the login form rather than turned into a redirect.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isBackendUrl(req.url) || req.url === TOKEN_URL) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
