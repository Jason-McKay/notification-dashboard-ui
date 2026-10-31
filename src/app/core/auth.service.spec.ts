import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('exchanges the credential for a token and keeps it in memory only', () => {
    let signedIn = false;
    service.login('notification-client', 'test-secret').subscribe(() => (signedIn = true));

    const req = http.expectOne({ method: 'POST', url: '/api/auth/token' });
    expect(req.request.body).toEqual({
      clientId: 'notification-client',
      clientSecret: 'test-secret',
    });
    req.flush({ accessToken: 'token-1', tokenType: 'Bearer' });

    expect(signedIn).toBe(true);
    expect(service.token()).toBe('token-1');
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('stays signed out when the credential is rejected', () => {
    let failed = false;
    service.login('notification-client', 'wrong').subscribe({ error: () => (failed = true) });

    http.expectOne('/api/auth/token').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('forgets the token on logout', () => {
    service.login('notification-client', 'test-secret').subscribe();
    http.expectOne('/api/auth/token').flush({ accessToken: 'token-1', tokenType: 'Bearer' });

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
