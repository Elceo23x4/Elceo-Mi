import type { CanonicalAssetSymbol, NotificationChannel, Timeframe } from '@elceo/types';

export type DeliverySupportedChannel = Extract<NotificationChannel, 'in_app' | 'push' | 'email'>;

export type InAppDeliveryPayload = {
  title: string;
  body: string;
  decisionId: string;
  ruleKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  createdAt: string;
};

export type PushDeliveryPayload = {
  title: string;
  body: string;
  decisionId: string;
  ruleKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  createdAt: string;
};

export type EmailDeliveryPayload = {
  subject: string;
  body: string;
  decisionId: string;
  ruleKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  createdAt: string;
};

export type NotificationDeliveryChannelPayload = InAppDeliveryPayload | PushDeliveryPayload | EmailDeliveryPayload;

export type NotificationDeliveryChannelContract =
  | { channel: 'in_app'; payload: InAppDeliveryPayload; dedupeKey: string; deliveryKey: string }
  | { channel: 'push'; payload: PushDeliveryPayload; dedupeKey: string; deliveryKey: string }
  | { channel: 'email'; payload: EmailDeliveryPayload; dedupeKey: string; deliveryKey: string };
