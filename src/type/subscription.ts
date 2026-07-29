import type { Plan } from './plan';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Subscription {
  id: number;
  user_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  sms_used: number;
  current_period_start: string; // date (YYYY-MM-DD)
  current_period_end: string;   // date (YYYY-MM-DD)
  created_at: string;
  updated_at: string;

  plan?: Plan; // présent si ->load('plan') / ->with('plan') côté back
}