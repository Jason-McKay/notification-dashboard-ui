import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Params, RouterLink } from '@angular/router';
import { startWith, switchMap } from 'rxjs';
import { describeHttpError } from '../core/http-error';
import { Channel, CHANNELS, DeliveryStats, DeliveryStatus } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { RefreshService } from '../core/refresh.service';
import { settle } from '../core/settle';
import { statusLabel } from '../shared/status-chip';

interface Card {
  label: string;
  value: number;
  status: DeliveryStatus | null;
  note: string | null;
  query: Params;
}

interface ChannelBar {
  channel: Channel;
  count: number;
  percent: number;
  title: string;
}

const CARD_STATUSES: DeliveryStatus[] = ['SENT', 'RETRYING', 'FAILED', 'DEAD_LETTERED'];

@Component({
  selector: 'app-overview',
  imports: [DatePipe, RouterLink],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  private readonly notifications = inject(NotificationsService);
  private readonly refresh = inject(RefreshService);

  protected readonly stats = signal<DeliveryStats | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly cards = computed<Card[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    const total: Card = {
      label: 'Total',
      value: stats.total,
      status: null,
      note: `incl. ${stats.byStatus.PENDING} pending`,
      query: {},
    };
    return [
      total,
      ...CARD_STATUSES.map((status) => ({
        label: statusLabel(status),
        value: stats.byStatus[status],
        status,
        note: null,
        query: { status },
      })),
    ];
  });

  /** Each channel's share of the total, so the bars add up to the whole. */
  protected readonly channels = computed<ChannelBar[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    return CHANNELS.map((channel) => {
      const count = stats.byChannel[channel];
      const percent = stats.total ? (count / stats.total) * 100 : 0;
      return {
        channel,
        count,
        percent,
        title: `${channel}: ${count} of ${stats.total} (${Math.round(percent)}%)`,
      };
    });
  });

  constructor() {
    this.refresh.ticks$
      .pipe(
        startWith(undefined),
        switchMap(() => settle(this.notifications.stats())),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.stats.set(result.value);
          this.error.set(null);
        } else {
          this.error.set(describeHttpError(result.error, 'Could not load the stats'));
        }
      });
  }
}
