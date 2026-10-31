import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationsService } from '../core/notifications.service';
import { RefreshService } from '../core/refresh.service';
import { Shell } from './shell';

describe('Shell', () => {
  const notifications = { send: vi.fn() };
  const refresh = { enabled: signal(true), toggle: vi.fn(), nudge: vi.fn() };
  const auth = { logout: vi.fn() };
  let fixture: ComponentFixture<Shell>;

  const page = () => fixture.nativeElement as HTMLElement;
  const button = (label: string): HTMLButtonElement => {
    const found = Array.from(page().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    );
    if (!found) {
      throw new Error(`no button ${label}`);
    }
    return found;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    refresh.enabled.set(true);
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        { provide: NotificationsService, useValue: notifications },
        { provide: RefreshService, useValue: refresh },
        { provide: AuthService, useValue: auth },
      ],
    });
    fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
  });

  it('sends a test notification, links to it and refreshes the views', async () => {
    notifications.send.mockReturnValue(of({ eventId: 'abcdef12-3456', duplicate: false }));

    button('Send test').click();
    await fixture.whenStable();

    expect(notifications.send).toHaveBeenCalledWith({ failOnPurpose: false });
    expect(page().querySelector('.send-result')?.textContent).toContain('Accepted abcdef12');
    expect(page().querySelector('a[href="/notifications?selected=abcdef12-3456"]')).toBeTruthy();
    expect(refresh.nudge).toHaveBeenCalled();
  });

  it('sends one that will fail when asked to', async () => {
    notifications.send.mockReturnValue(of({ eventId: 'e-1', duplicate: false }));
    const checkbox = page().querySelector<HTMLInputElement>('input[type=checkbox]');
    checkbox?.click();
    await fixture.whenStable();

    button('Send test').click();

    expect(notifications.send).toHaveBeenCalledWith({ failOnPurpose: true });
  });

  it('shows a failed send inline', async () => {
    notifications.send.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

    button('Send test').click();
    await fixture.whenStable();

    expect(page().querySelector('.send-result .error')?.textContent).toContain(
      'Send failed: the backend answered 503',
    );
    expect(refresh.nudge).not.toHaveBeenCalled();
  });

  it('shows and flips the auto-refresh state', async () => {
    const toggle = button('Auto-refresh');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    expect(refresh.toggle).toHaveBeenCalled();

    refresh.enabled.set(false);
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('signs out to the login screen', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    button('Sign out').click();

    expect(auth.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
