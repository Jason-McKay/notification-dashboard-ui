import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { NotificationDetail } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { RefreshService } from '../core/refresh.service';
import { DetailPanel } from './detail-panel';

const DEAD_LETTERED: NotificationDetail = {
  eventId: 'e-1',
  recipientId: 'dashboard-demo',
  destination: 'demo@example.com',
  channel: 'EMAIL',
  templateKey: 'no-such-template',
  status: 'DEAD_LETTERED',
  requestedAt: '2026-10-31T10:00:00.000Z',
  updatedAt: '2026-10-31T10:00:03.100Z',
  attempts: [
    {
      status: 'FAILED',
      detail: 'no template no-such-template',
      attemptedAt: '2026-10-31T10:00:00.050Z',
    },
    {
      status: 'FAILED',
      detail: 'no template no-such-template',
      attemptedAt: '2026-10-31T10:00:01.060Z',
    },
    { status: 'FAILED', detail: null, attemptedAt: '2026-10-31T10:00:03.070Z' },
    {
      status: 'DEAD_LETTERED',
      detail: 'parked on notification.requested-dlt',
      attemptedAt: '2026-10-31T10:00:03.100Z',
    },
  ],
};

describe('DetailPanel', () => {
  const notifications = { get: vi.fn() };
  const enabled = signal(true);
  let ticks: Subject<void>;
  let fixture: ComponentFixture<DetailPanel>;

  const page = () => fixture.nativeElement as HTMLElement;

  async function render(eventId = 'e-1'): Promise<void> {
    fixture = TestBed.createComponent(DetailPanel);
    fixture.componentRef.setInput('eventId', eventId);
    await fixture.whenStable();
  }

  beforeEach(() => {
    notifications.get.mockReset();
    enabled.set(true);
    ticks = new Subject<void>();
    TestBed.configureTestingModule({
      imports: [DetailPanel],
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: RefreshService, useValue: { ticks$: ticks, enabled } },
      ],
    });
  });

  it('shows the delivery and every attempt in order', async () => {
    notifications.get.mockReturnValue(of(DEAD_LETTERED));
    await render();

    expect(notifications.get).toHaveBeenCalledWith('e-1');
    const rows = Array.from(page().querySelectorAll('.timeline li')).map((li) => ({
      status: li.querySelector('app-status-chip')?.textContent?.trim(),
      detail: li.querySelector('.attempt-detail')?.textContent?.trim() ?? null,
    }));
    expect(rows).toEqual([
      { status: 'Failed', detail: 'no template no-such-template' },
      { status: 'Failed', detail: 'no template no-such-template' },
      { status: 'Failed', detail: null },
      { status: 'Dead-lettered', detail: 'parked on notification.requested-dlt' },
    ]);
    expect(page().querySelector('.timeline time')?.getAttribute('datetime')).toBe(
      '2026-10-31T10:00:00.050Z',
    );
  });

  it('waits for the worker on a 404 and shows the delivery once it is recorded', async () => {
    notifications.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await render();

    expect(page().textContent).toContain('Not recorded yet');
    expect(page().querySelector('[role=alert]')).toBeNull();

    notifications.get.mockReturnValue(of(DEAD_LETTERED));
    ticks.next();
    await fixture.whenStable();

    expect(page().textContent).not.toContain('Not recorded yet');
    expect(page().querySelectorAll('.timeline li').length).toBe(4);
  });

  it('says so when it cannot keep checking because auto-refresh is off', async () => {
    enabled.set(false);
    notifications.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await render();

    expect(page().textContent).toContain('Auto-refresh is off');
  });

  it('shows any other failure inline', async () => {
    notifications.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await render();

    expect(page().querySelector('[role=alert]')?.textContent).toContain('lacks the scope');
  });

  it('loads the new delivery when the selection changes', async () => {
    notifications.get.mockReturnValue(of(DEAD_LETTERED));
    await render();

    notifications.get.mockReturnValue(of({ ...DEAD_LETTERED, eventId: 'e-2', attempts: [] }));
    fixture.componentRef.setInput('eventId', 'e-2');
    await fixture.whenStable();

    expect(notifications.get).toHaveBeenLastCalledWith('e-2');
    expect(page().textContent).toContain('No attempts yet');
  });

  it('closes from the button and from Escape', async () => {
    notifications.get.mockReturnValue(of(DEAD_LETTERED));
    await render();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    page().querySelector<HTMLButtonElement>('button[aria-label="Close details"]')?.click();
    page().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed).toHaveBeenCalledTimes(2);
  });
});
