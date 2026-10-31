export const DELIVERY_STATUSES = [
  'PENDING',
  'SENT',
  'RETRYING',
  'FAILED',
  'DEAD_LETTERED',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const CHANNELS = ['EMAIL', 'SMS', 'PUSH'] as const;
export type Channel = (typeof CHANNELS)[number];

/** Fields shared by a list row and the detail read. */
interface NotificationFields {
  eventId: string;
  recipientId: string;
  destination: string;
  channel: Channel;
  templateKey: string;
  status: DeliveryStatus;
  requestedAt: string;
  updatedAt: string;
}

/** A row of the list. attemptCount counts delivery tries, not the DEAD_LETTERED marker. */
export interface NotificationSummary extends NotificationFields {
  attemptCount: number;
}

export interface NotificationPage {
  items: NotificationSummary[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface Attempt {
  status: DeliveryStatus;
  detail: string | null;
  attemptedAt: string;
}

/** The detail read: no attemptCount, but every attempt, oldest first. */
export interface NotificationDetail extends NotificationFields {
  attempts: Attempt[];
}

/** Counts over rows updated in the last 24 hours; every key is present, zeros included. */
export interface DeliveryStats {
  since: string;
  total: number;
  byStatus: Record<DeliveryStatus, number>;
  byChannel: Record<Channel, number>;
}

export interface SendReceipt {
  eventId: string;
  duplicate: boolean;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
}

export interface ListQuery {
  status: DeliveryStatus | null;
  channel: Channel | null;
  recipientId: string | null;
  page: number;
}

export function asStatus(value: string | null | undefined): DeliveryStatus | null {
  return DELIVERY_STATUSES.find((status) => status === value) ?? null;
}

export function asChannel(value: string | null | undefined): Channel | null {
  return CHANNELS.find((channel) => channel === value) ?? null;
}
