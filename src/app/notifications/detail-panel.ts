import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { startWith, switchMap, tap } from 'rxjs';
import { describeHttpError } from '../core/http-error';
import { NotificationDetail } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { RefreshService } from '../core/refresh.service';
import { settle } from '../core/settle';
import { StatusChip } from '../shared/status-chip';

/**
 * One delivery and its attempts. Right after a send the worker has not consumed the event yet,
 * so a 404 means "not recorded yet" and the panel keeps polling rather than reporting an error.
 */
@Component({
  selector: 'app-detail-panel',
  imports: [DatePipe, StatusChip],
  templateUrl: './detail-panel.html',
  styleUrl: './detail-panel.scss',
  host: { '(keydown.escape)': 'closed.emit()' },
})
export class DetailPanel {
  private readonly notifications = inject(NotificationsService);
  protected readonly refresh = inject(RefreshService);

  readonly eventId = input.required<string>();
  readonly closed = output<void>();

  protected readonly detail = signal<NotificationDetail | null>(null);
  protected readonly waiting = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    toObservable(this.eventId)
      .pipe(
        tap(() => {
          this.detail.set(null);
          this.waiting.set(false);
          this.error.set(null);
        }),
        switchMap((eventId) =>
          this.refresh.ticks$.pipe(
            startWith(undefined),
            switchMap(() => settle(this.notifications.get(eventId))),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.detail.set(result.value);
          this.waiting.set(false);
          this.error.set(null);
        } else if (result.error instanceof HttpErrorResponse && result.error.status === 404) {
          this.waiting.set(true);
          this.error.set(null);
        } else {
          this.error.set(describeHttpError(result.error, 'Could not load this notification'));
        }
      });
  }
}
