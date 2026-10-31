import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  fromEvent,
  map,
  merge,
  Observable,
  startWith,
  Subject,
  switchMap,
  timer,
} from 'rxjs';

export const REFRESH_INTERVAL_MS = new InjectionToken<number>('REFRESH_INTERVAL_MS', {
  factory: () => 5000,
});

@Injectable({ providedIn: 'root' })
export class RefreshService {
  private readonly document = inject(DOCUMENT);
  private readonly interval = inject(REFRESH_INTERVAL_MS);
  private readonly enabled$ = new BehaviorSubject(true);
  private readonly nudges$ = new Subject<void>();

  readonly enabled = toSignal(this.enabled$, { requireSync: true });

  private readonly visible$ = fromEvent(this.document, 'visibilitychange').pipe(
    startWith(null),
    map(() => this.document.visibilityState === 'visible'),
  );

  /**
   * When a view should reload. Each subscriber loads once on its own first, so the first tick
   * comes one interval in; after that it ticks every interval while auto-refresh is on and the
   * tab is visible, at once when either comes back, and on every nudge(). Cold on purpose:
   * each view gets its own timer, which stops when the view is destroyed.
   */
  readonly ticks$: Observable<void> = merge(
    combineLatest([this.enabled$, this.visible$]).pipe(
      map(([enabled, visible]) => enabled && visible),
      distinctUntilChanged(),
      switchMap((active, index) =>
        active ? timer(index === 0 ? this.interval : 0, this.interval) : EMPTY,
      ),
      map(() => undefined),
    ),
    this.nudges$,
  );

  toggle(): void {
    this.enabled$.next(!this.enabled$.value);
  }

  nudge(): void {
    this.nudges$.next();
  }
}
