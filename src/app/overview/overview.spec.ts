import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { DeliveryStats } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { RefreshService } from '../core/refresh.service';
import { Overview } from './overview';

const STATS: DeliveryStats = {
  since: '2026-10-30T10:00:00Z',
  total: 20,
  byStatus: { PENDING: 2, SENT: 12, RETRYING: 3, FAILED: 0, DEAD_LETTERED: 3 },
  byChannel: { EMAIL: 15, SMS: 5, PUSH: 0 },
};

describe('Overview', () => {
  const notifications = { stats: vi.fn() };
  let ticks: Subject<void>;
  let fixture: ComponentFixture<Overview>;

  const page = () => fixture.nativeElement as HTMLElement;

  async function render(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [Overview],
      providers: [
        provideRouter([]),
        { provide: NotificationsService, useValue: notifications },
        { provide: RefreshService, useValue: { ticks$: ticks } },
      ],
    });
    fixture = TestBed.createComponent(Overview);
    await fixture.whenStable();
  }

  beforeEach(() => {
    notifications.stats.mockReset();
    ticks = new Subject<void>();
  });

  it('shows a card per headline count, each linking to the list it counts', async () => {
    notifications.stats.mockReturnValue(of(STATS));
    await render();

    const cards = Array.from(page().querySelectorAll<HTMLAnchorElement>('a.card')).map((card) => ({
      label: card.querySelector('.card-label')?.textContent?.trim(),
      value: card.querySelector('.card-value')?.textContent?.trim(),
      href: card.getAttribute('href'),
    }));
    expect(cards).toEqual([
      { label: 'Total', value: '20', href: '/notifications' },
      { label: 'Sent', value: '12', href: '/notifications?status=SENT' },
      { label: 'Retrying', value: '3', href: '/notifications?status=RETRYING' },
      { label: 'Failed', value: '0', href: '/notifications?status=FAILED' },
      { label: 'Dead-lettered', value: '3', href: '/notifications?status=DEAD_LETTERED' },
    ]);
    expect(page().querySelector('.card-note')?.textContent).toContain('incl. 2 pending');
  });

  it('draws each channel as its share of the total', async () => {
    notifications.stats.mockReturnValue(of(STATS));
    await render();

    const bars = Array.from(page().querySelectorAll<HTMLElement>('.bar-row')).map((row) => ({
      label: row.querySelector('.bar-label')?.textContent?.trim(),
      width: row.querySelector<HTMLElement>('.bar-fill')?.style.width,
      value: row.querySelector('.bar-value')?.textContent?.trim(),
      title: row.getAttribute('title'),
    }));
    expect(bars).toEqual([
      { label: 'EMAIL', width: '75%', value: '15', title: 'EMAIL: 15 of 20 (75%)' },
      { label: 'SMS', width: '25%', value: '5', title: 'SMS: 5 of 20 (25%)' },
      { label: 'PUSH', width: '0%', value: '0', title: 'PUSH: 0 of 20 (0%)' },
    ]);
  });

  it('reloads on every tick', async () => {
    notifications.stats.mockReturnValue(of(STATS));
    await render();

    notifications.stats.mockReturnValue(of({ ...STATS, total: 21 }));
    ticks.next();
    await fixture.whenStable();

    expect(notifications.stats).toHaveBeenCalledTimes(2);
    expect(page().querySelector('.card-value')?.textContent?.trim()).toBe('21');
  });

  it('shows a failure inline and recovers on the next tick', async () => {
    notifications.stats.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 502 })));
    await render();

    expect(page().querySelector('[role=alert]')?.textContent).toContain(
      'Could not load the stats: the backend answered 502',
    );

    notifications.stats.mockReturnValue(of(STATS));
    ticks.next();
    await fixture.whenStable();

    expect(page().querySelector('[role=alert]')).toBeNull();
    expect(page().querySelectorAll('a.card').length).toBe(5);
  });
});
