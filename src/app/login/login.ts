import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { describeHttpError } from '../core/http-error';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly clientId = signal('notification-client');
  protected readonly clientSecret = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.busy() || !this.clientId().trim() || !this.clientSecret()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(this.clientId().trim(), this.clientSecret()).subscribe({
      next: () => void this.router.navigateByUrl('/overview'),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(
          err instanceof HttpErrorResponse && err.status === 401
            ? 'Client credentials rejected.'
            : describeHttpError(err, 'Sign-in failed'),
        );
      },
    });
  }
}
