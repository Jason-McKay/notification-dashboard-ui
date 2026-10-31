import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import { REFRESH_INTERVAL_MS, RefreshService } from './refresh.service';

describe('RefreshService', () => {
  let visibility: DocumentVisibilityState;
  let service: RefreshService;
  let ticks: number;
  let subscription: Subscription;

  function setVisibility(state: DocumentVisibilityState): void {
    visibility = state;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    TestBed.configureTestingModule({
      providers: [{ provide: REFRESH_INTERVAL_MS, useValue: 1000 }],
    });
    service = TestBed.inject(RefreshService);
    ticks = 0;
    subscription = service.ticks$.subscribe(() => ticks++);
  });

  afterEach(() => {
    subscription.unsubscribe();
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('ticks every interval, starting one interval in', () => {
    expect(service.enabled()).toBe(true);
    vi.advanceTimersByTime(999);
    expect(ticks).toBe(0);

    vi.advanceTimersByTime(1);
    expect(ticks).toBe(1);

    vi.advanceTimersByTime(2000);
    expect(ticks).toBe(3);
  });

  it('stops when switched off and ticks at once when switched back on', () => {
    service.toggle();
    expect(service.enabled()).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(ticks).toBe(0);

    service.toggle();
    vi.advanceTimersByTime(0);
    expect(ticks).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(ticks).toBe(2);
  });

  it('pauses while the tab is hidden and ticks at once when it is shown again', () => {
    setVisibility('hidden');
    vi.advanceTimersByTime(5000);
    expect(ticks).toBe(0);

    setVisibility('visible');
    vi.advanceTimersByTime(0);
    expect(ticks).toBe(1);
  });

  it('ticks on a nudge even when auto-refresh is off', () => {
    service.toggle();

    service.nudge();

    expect(ticks).toBe(1);
  });
});
