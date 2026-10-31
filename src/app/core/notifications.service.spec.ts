import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  DEMO_RECIPIENT,
  GOOD_TEMPLATE,
  MISSING_TEMPLATE,
  NotificationsService,
} from './notifications.service';

const EMPTY_PAGE = { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 };

describe('NotificationsService', () => {
  let service: NotificationsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads a page from the worker and leaves unset filters out of the query', () => {
    service.list({ status: null, channel: null, recipientId: null, page: 0 }).subscribe();

    const req = http.expectOne((r) => r.url === '/worker/api/notifications');
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toBe('/worker/api/notifications?page=0&size=20');
    req.flush(EMPTY_PAGE);
  });

  it('passes every filter that is set', () => {
    service
      .list({ status: 'DEAD_LETTERED', channel: 'EMAIL', recipientId: 'user-42', page: 2 })
      .subscribe();

    const req = http.expectOne((r) => r.url === '/worker/api/notifications');
    expect(req.request.urlWithParams).toBe(
      '/worker/api/notifications?page=2&size=20&status=DEAD_LETTERED&channel=EMAIL&recipientId=user-42',
    );
    req.flush(EMPTY_PAGE);
  });

  it('reads the stats and a single delivery from the worker', () => {
    service.stats().subscribe();
    http.expectOne({ method: 'GET', url: '/worker/api/notifications/stats' }).flush({});

    service.get('a/b').subscribe();
    http.expectOne({ method: 'GET', url: '/worker/api/notifications/a%2Fb' }).flush({});
  });

  it('sends to the api with a fresh Idempotency-Key every time', () => {
    service.send({ failOnPurpose: false }).subscribe();
    service.send({ failOnPurpose: false }).subscribe();

    const [first, second] = http.match({ method: 'POST', url: '/api/notifications' });
    expect(first.request.body).toEqual(
      expect.objectContaining({
        recipientId: DEMO_RECIPIENT,
        channel: 'EMAIL',
        templateKey: GOOD_TEMPLATE,
      }),
    );
    expect(first.request.body.payload.orderId).toMatch(/^DEMO-[0-9A-F]{6}$/);
    const firstKey = first.request.headers.get('Idempotency-Key');
    expect(firstKey).toBeTruthy();
    expect(second.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
    first.flush({ eventId: 'e-1', duplicate: false });
    second.flush({ eventId: 'e-2', duplicate: false });
  });

  it('sends a template the worker cannot render when failing on purpose', () => {
    service.send({ failOnPurpose: true }).subscribe();

    const req = http.expectOne({ method: 'POST', url: '/api/notifications' });
    expect(req.request.body.templateKey).toBe(MISSING_TEMPLATE);
    req.flush({ eventId: 'e-1', duplicate: false });
  });
});
