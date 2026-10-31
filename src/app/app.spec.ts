import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthService } from './core/auth.service';

describe('App routes', () => {
  const isAuthenticated = signal(false);

  beforeEach(() => {
    isAuthenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated, logout: vi.fn() } },
      ],
    });
  });

  it('sends a signed-out visitor to the login screen', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/notifications?status=SENT');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.matches('app-login')).toBe(true);
  });

  // Every URL the app itself navigates to, or links to, must land on a real view.
  it.each([
    ['/', '/overview', 'app-overview'],
    ['/overview', '/overview', 'app-overview'],
    ['/notifications', '/notifications', 'app-notification-list'],
    ['/notifications?status=RETRYING', '/notifications?status=RETRYING', 'app-notification-list'],
    ['/notifications?selected=e-1', '/notifications?selected=e-1', 'app-notification-list'],
    ['/no-such-page', '/overview', 'app-overview'],
  ])('routes %s when signed in', async (url, landsOn, view) => {
    isAuthenticated.set(true);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(url);

    expect(TestBed.inject(Router).url).toBe(landsOn);
    expect(harness.routeNativeElement?.querySelector(view)).toBeTruthy();
  });

  it('routes /login', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/login');

    expect(harness.routeNativeElement?.matches('app-login')).toBe(true);
  });
});
