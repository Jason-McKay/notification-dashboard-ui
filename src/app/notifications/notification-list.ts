import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { debounceTime, map, startWith, Subject, switchMap } from 'rxjs';
import { describeHttpError } from '../core/http-error';
import {
  asChannel,
  asStatus,
  CHANNELS,
  DELIVERY_STATUSES,
  ListQuery,
  NotificationPage,
} from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { RefreshService } from '../core/refresh.service';
import { settle } from '../core/settle';
import { StatusChip, statusLabel } from '../shared/status-chip';
import { DetailPanel } from './detail-panel';

const sameQuery = (a: ListQuery, b: ListQuery) =>
  a.status === b.status &&
  a.channel === b.channel &&
  a.recipientId === b.recipientId &&
  a.page === b.page;

function toPageIndex(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 0;
}

/**
 * Filters, page and the open row all live in the query string, so every view is a link and
 * closing the panel keeps the filters. The page is 0-based, as the worker's is, and left out
 * of the URL when it is 0.
 */
@Component({
  selector: 'app-notification-list',
  imports: [DatePipe, DetailPanel, StatusChip],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
})
export class NotificationList {
  private readonly notifications = inject(NotificationsService);
  private readonly refresh = inject(RefreshService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Bound from the query string by withComponentInputBinding().
  readonly status = input<string>();
  readonly channel = input<string>();
  readonly recipient = input<string>();
  readonly page = input<string>();
  readonly selected = input<string>();

  protected readonly statuses = DELIVERY_STATUSES;
  protected readonly channels = CHANNELS;
  protected readonly statusLabel = statusLabel;

  protected readonly query = computed<ListQuery>(
    () => ({
      status: asStatus(this.status()),
      channel: asChannel(this.channel()),
      recipientId: this.recipient()?.trim() || null,
      page: toPageIndex(this.page()),
    }),
    { equal: sameQuery },
  );
  protected readonly filtered = computed(() => {
    const query = this.query();
    return query.status !== null || query.channel !== null || query.recipientId !== null;
  });

  protected readonly recipientDraft = linkedSignal(() => this.recipient() ?? '');
  protected readonly result = signal<NotificationPage | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly recipientTyped = new Subject<string>();

  constructor() {
    toObservable(this.query)
      .pipe(
        switchMap((query) =>
          this.refresh.ticks$.pipe(
            startWith(undefined),
            map(() => query),
          ),
        ),
        switchMap((query) => settle(this.notifications.list(query))),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.result.set(result.value);
          this.error.set(null);
        } else {
          this.error.set(describeHttpError(result.error, 'Could not load notifications'));
        }
      });

    this.recipientTyped
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => this.applyRecipient(value));
  }

  protected filterBy(changes: Params): void {
    this.navigate({ ...changes, page: null });
  }

  protected onRecipientInput(value: string): void {
    this.recipientDraft.set(value);
    this.recipientTyped.next(value);
  }

  protected applyRecipient(value: string): void {
    const recipient = value.trim() || null;
    if (recipient !== this.query().recipientId) {
      this.filterBy({ recipient });
    }
  }

  protected goToPage(index: number): void {
    this.navigate({ page: index > 0 ? index : null });
  }

  protected select(eventId: string): void {
    this.navigate({ selected: eventId });
  }

  protected closeDetail(): void {
    this.navigate({ selected: null });
  }

  private navigate(queryParams: Params): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
