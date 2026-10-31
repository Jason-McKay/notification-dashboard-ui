import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { NotificationPage, NotificationSummary } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { RefreshService } from '../core/refresh.service';
import { NotificationList } from './notification-list';

const row = (
  eventId: string,
  overrides: Partial<NotificationSummary> = {},
): NotificationSummary => ({
  eventId,
  recipientId: 'dashboard-demo',
  destination: 'demo@example.com',
  channel: 'EMAIL',
  templateKey: 'order-shipped',
  status: 'SENT',
  requestedAt: '2026-10-31T10:00:00Z',
  updatedAt: '2026-10-31T10:00:01Z',
  attemptCount: 1,
  ...overrides,
});

const PAGE: NotificationPage = {
  items: [row('e-1'), row('e-2', { status: 'RETRYING', attemptCount: 2 })],
  page: 0,
  size: 20,
  totalItems: 45,
  totalPages: 3,
};

describe('NotificationList', () => {
  const notifications = { list: vi.fn(), get: vi.fn() };
  let ticks: Subject<void>;
  let harness: RouterTestingHarness;

  const page = () => harness.routeNativeElement as HTMLElement;
  const url = () => TestBed.inject(Router).url;
  const select = (id: string) => page().querySelector<HTMLSelectElement>(id) as HTMLSelectElement;
  const recipientBox = () =>
    page().querySelector<HTMLInputElement>('#recipient-filter') as HTMLInputElement;
  const button = (label: string) =>
    Array.from(page().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    ) as HTMLButtonElement;

  async function open(path: string): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(path);
  }

  async function settled(): Promise<void> {
    await harness.fixture.whenStable();
    await harness.fixture.whenStable();
  }

  beforeEach(() => {
    notifications.list.mockReset().mockReturnValue(of(PAGE));
    notifications.get.mockReset().mockReturnValue(NEVER);
    ticks = new Subject<void>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'notifications', component: NotificationList }],
          withComponentInputBinding(),
        ),
        { provide: NotificationsService, useValue: notifications },
        { provide: RefreshService, useValue: { ticks$: ticks, enabled: signal(true) } },
      ],
    });
  });

  it('loads the page the URL describes', async () => {
    await open('/notifications?status=RETRYING&channel=SMS&recipient=user-42&page=2');

    expect(notifications.list).toHaveBeenLastCalledWith({
      status: 'RETRYING',
      channel: 'SMS',
      recipientId: 'user-42',
      page: 2,
    });
    expect(select('#status-filter').value).toBe('RETRYING');
    expect(select('#channel-filter').value).toBe('SMS');
    expect(recipientBox().value).toBe('user-42');
  });

  it('ignores values the worker would reject', async () => {
    await open('/notifications?status=BOGUS&channel=FAX&page=-1');

    expect(notifications.list).toHaveBeenLastCalledWith({
      status: null,
      channel: null,
      recipientId: null,
      page: 0,
    });
  });

  it('shows a row per delivery with its status and attempt count', async () => {
    await open('/notifications');

    const rows = Array.from(page().querySelectorAll('tbody tr')).map((tr) => ({
      status: tr.querySelector('app-status-chip')?.textContent?.trim(),
      attempts: tr.querySelector('td.num')?.textContent?.trim(),
    }));
    expect(rows).toEqual([
      { status: 'Sent', attempts: '1' },
      { status: 'Retrying', attempts: '2' },
    ]);
    expect(page().querySelector('.pager')?.textContent).toContain('Page 1 of 3');
    expect(page().querySelector('.pager')?.textContent).toContain('45 total');
  });

  it('goes back to the first page when a filter changes', async () => {
    await open('/notifications?page=2');

    const status = select('#status-filter');
    status.value = 'DEAD_LETTERED';
    status.dispatchEvent(new Event('change'));
    await settled();

    expect(url()).toBe('/notifications?status=DEAD_LETTERED');
    expect(notifications.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'DEAD_LETTERED', page: 0 }),
    );
  });

  it('filters by recipient on Enter', async () => {
    await open('/notifications');

    const box = recipientBox();
    box.value = ' dashboard-demo ';
    box.dispatchEvent(new Event('input'));
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settled();

    expect(url()).toBe('/notifications?recipient=dashboard-demo');
    expect(notifications.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ recipientId: 'dashboard-demo' }),
    );
  });

  it('filters by recipient once typing stops', async () => {
    await open('/notifications');

    const box = recipientBox();
    box.value = 'user-42';
    box.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settled();

    expect(url()).toBe('/notifications?recipient=user-42');
  });

  it('pages forward and back', async () => {
    await open('/notifications');
    expect(button('Previous').disabled).toBe(true);

    button('Next').click();
    await settled();
    expect(url()).toBe('/notifications?page=1');
    expect(notifications.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));

    notifications.list.mockReturnValue(of({ ...PAGE, page: 1 }));
    ticks.next();
    await settled();
    button('Previous').click();
    await settled();
    expect(url()).toBe('/notifications');
  });

  it('opens a row in the panel and closes it again, keeping the filters', async () => {
    await open('/notifications?status=SENT');

    page().querySelector<HTMLElement>('tbody tr')?.click();
    await settled();

    expect(url()).toBe('/notifications?status=SENT&selected=e-1');
    expect(page().querySelector('app-detail-panel')).toBeTruthy();
    expect(notifications.get).toHaveBeenCalledWith('e-1');
    expect(page().querySelector('tbody tr')?.getAttribute('aria-current')).toBe('true');

    page().querySelector<HTMLButtonElement>('button[aria-label="Close details"]')?.click();
    await settled();

    expect(url()).toBe('/notifications?status=SENT');
    expect(page().querySelector('app-detail-panel')).toBeNull();
  });

  it('opens a row from the keyboard', async () => {
    await open('/notifications');

    page()
      .querySelectorAll('tbody tr')[1]
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settled();

    expect(url()).toBe('/notifications?selected=e-2');
  });

  it('reloads the same page on every tick', async () => {
    await open('/notifications?channel=EMAIL');

    ticks.next();
    await settled();

    expect(notifications.list).toHaveBeenCalledTimes(2);
    expect(notifications.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ channel: 'EMAIL' }),
    );
  });

  it('says when nothing matches the filters', async () => {
    notifications.list.mockReturnValue(of({ ...PAGE, items: [], totalItems: 0, totalPages: 0 }));
    await open('/notifications?status=FAILED');

    expect(page().querySelector('.empty')?.textContent).toContain('No notifications match');
    expect(page().querySelector('.pager')?.textContent).toContain('Page 1 of 1');
  });

  it('shows a failure inline', async () => {
    notifications.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await open('/notifications');

    expect(page().querySelector('[role=alert]')?.textContent).toContain(
      'Could not load notifications: the backend answered 500',
    );
  });
});
