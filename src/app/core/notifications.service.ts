import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API, WORKER } from './api-paths';
import {
  DeliveryStats,
  ListQuery,
  NotificationDetail,
  NotificationPage,
  SendReceipt,
} from './models';

export const PAGE_SIZE = 20;
export const DEMO_RECIPIENT = 'dashboard-demo';
export const GOOD_TEMPLATE = 'order-shipped';
/** The api accepts any template key; the worker cannot render this one, so it dead-letters. */
export const MISSING_TEMPLATE = 'no-such-template';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);

  list(query: ListQuery): Observable<NotificationPage> {
    let params = new HttpParams().set('page', query.page).set('size', PAGE_SIZE);
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.channel) {
      params = params.set('channel', query.channel);
    }
    if (query.recipientId) {
      params = params.set('recipientId', query.recipientId);
    }
    return this.http.get<NotificationPage>(`${WORKER}/notifications`, { params });
  }

  stats(): Observable<DeliveryStats> {
    return this.http.get<DeliveryStats>(`${WORKER}/notifications/stats`);
  }

  get(eventId: string): Observable<NotificationDetail> {
    return this.http.get<NotificationDetail>(
      `${WORKER}/notifications/${encodeURIComponent(eventId)}`,
    );
  }

  /** Every call is a new notification: a fresh Idempotency-Key, so the api never dedupes it. */
  send(options: { failOnPurpose: boolean }): Observable<SendReceipt> {
    const key = crypto.randomUUID();
    const body = {
      recipientId: DEMO_RECIPIENT,
      destination: 'demo@example.com',
      channel: 'EMAIL',
      templateKey: options.failOnPurpose ? MISSING_TEMPLATE : GOOD_TEMPLATE,
      payload: { orderId: `DEMO-${key.slice(0, 6).toUpperCase()}` },
    };
    return this.http.post<SendReceipt>(`${API}/notifications`, body, {
      headers: { 'Idempotency-Key': key },
    });
  }
}
