import { Component, computed, input } from '@angular/core';
import { DeliveryStatus } from '../core/models';

const LABELS: Record<DeliveryStatus, string> = {
  PENDING: 'Pending',
  SENT: 'Sent',
  RETRYING: 'Retrying',
  FAILED: 'Failed',
  DEAD_LETTERED: 'Dead-lettered',
};

export function statusLabel(status: DeliveryStatus): string {
  return LABELS[status];
}

/**
 * The label is always written out: the warning and serious colours are below 3:1 contrast on
 * the surface, so the colour only ever backs the text up.
 */
@Component({
  selector: 'app-status-chip',
  template: `<span class="dot" aria-hidden="true"></span>{{ label() }}`,
  host: { class: 'chip', '[attr.data-status]': 'status()' },
})
export class StatusChip {
  readonly status = input.required<DeliveryStatus>();
  protected readonly label = computed(() => statusLabel(this.status()));
}
