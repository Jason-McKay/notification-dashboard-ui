import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { Login } from './login';

describe('Login', () => {
  const auth = { login: vi.fn() };
  let fixture: ComponentFixture<Login>;
  let navigate: ReturnType<typeof vi.spyOn>;

  const element = <T extends Element>(selector: string): T => {
    const found = (fixture.nativeElement as HTMLElement).querySelector<T>(selector);
    if (!found) {
      throw new Error(`no ${selector}`);
    }
    return found;
  };

  async function signIn(secret: string): Promise<void> {
    const input = element<HTMLInputElement>('#client-secret');
    input.value = secret;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    element('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    auth.login.mockReset();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
  });

  it('prefills the client id but never the secret', () => {
    expect(element<HTMLInputElement>('#client-id').value).toBe('notification-client');
    expect(element<HTMLInputElement>('#client-secret').value).toBe('');
    expect(element<HTMLButtonElement>('button[type=submit]').disabled).toBe(true);
  });

  it('signs in and goes to the overview', async () => {
    auth.login.mockReturnValue(of(undefined));

    await signIn('test-secret');

    expect(auth.login).toHaveBeenCalledWith('notification-client', 'test-secret');
    expect(navigate).toHaveBeenCalledWith('/overview');
  });

  it('says the credential was rejected on a 401', async () => {
    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    await signIn('wrong');

    expect(element('[role=alert]').textContent).toContain('Client credentials rejected.');
    expect(element<HTMLButtonElement>('button[type=submit]').disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('points at the backend when it is not answering', async () => {
    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    await signIn('test-secret');

    expect(element('[role=alert]').textContent).toContain('Is docker compose up running?');
  });
});
