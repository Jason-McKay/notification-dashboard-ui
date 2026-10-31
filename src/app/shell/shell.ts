import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { describeHttpError } from '../core/http-error';
import { SendReceipt } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { RefreshService } from '../core/refresh.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);
  protected readonly refresh = inject(RefreshService);

  protected readonly failOnPurpose = signal(false);
  protected readonly sending = signal(false);
  protected readonly receipt = signal<SendReceipt | null>(null);
  protected readonly sendError = signal<string | null>(null);

  protected send(): void {
    this.sending.set(true);
    this.receipt.set(null);
    this.sendError.set(null);
    this.notifications.send({ failOnPurpose: this.failOnPurpose() }).subscribe({
      next: (receipt) => {
        this.sending.set(false);
        this.receipt.set(receipt);
        this.refresh.nudge();
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.sendError.set(describeHttpError(err, 'Send failed'));
      },
    });
  }

  protected signOut(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
