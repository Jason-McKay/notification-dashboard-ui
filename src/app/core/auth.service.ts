import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from './api-paths';
import { TokenResponse } from './models';

export const TOKEN_URL = `${API}/auth/token`;

/**
 * Holds the bearer token in memory only, never in localStorage or sessionStorage, so a reload
 * signs you out. See docs/adr/0001-in-memory-token-and-dev-proxy.md.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly current = signal<string | null>(null);

  readonly token = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  login(clientId: string, clientSecret: string): Observable<void> {
    return this.http.post<TokenResponse>(TOKEN_URL, { clientId, clientSecret }).pipe(
      map((response) => {
        this.current.set(response.accessToken);
      }),
    );
  }

  logout(): void {
    this.current.set(null);
  }
}
