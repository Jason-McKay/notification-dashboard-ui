import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    auth.login('notification-client', 'test-secret').subscribe();
    controller.expectOne('/api/auth/token').flush({ accessToken: 'token-1', tokenType: 'Bearer' });
  });

  afterEach(() => controller.verify());

  it('sends the bearer token to the api and to the worker', () => {
    http.post('/api/notifications', {}).subscribe();
    http.get('/worker/api/notifications/stats').subscribe();

    expect(controller.expectOne('/api/notifications').request.headers.get('Authorization')).toBe(
      'Bearer token-1',
    );
    expect(
      controller.expectOne('/worker/api/notifications/stats').request.headers.get('Authorization'),
    ).toBe('Bearer token-1');
  });

  it('sends it nowhere else', () => {
    http.get('/favicon.ico').subscribe();
    http.get('https://example.com/api/notifications').subscribe();
    http.post('/api/auth/token', {}).subscribe();

    expect(controller.expectOne('/favicon.ico').request.headers.has('Authorization')).toBe(false);
    expect(
      controller
        .expectOne('https://example.com/api/notifications')
        .request.headers.has('Authorization'),
    ).toBe(false);
    expect(controller.expectOne('/api/auth/token').request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('signs out and goes to the login screen when the token has expired', () => {
    let failed = false;
    http.get('/worker/api/notifications').subscribe({ error: () => (failed = true) });

    controller
      .expectOne('/worker/api/notifications')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('leaves a rejected login to the login form', () => {
    http.post('/api/auth/token', {}).subscribe({ error: () => undefined });

    controller
      .expectOne('/api/auth/token')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the session on other failures', () => {
    http.get('/worker/api/notifications').subscribe({ error: () => undefined });

    controller
      .expectOne('/worker/api/notifications')
      .flush(null, { status: 403, statusText: 'Forbidden' });

    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
