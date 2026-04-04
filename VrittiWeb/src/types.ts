export type Language = 'en' | 'hi';

export type Platform = 'Amazon' | 'Flipkart' | 'Meesho' | 'Zomato';

export type PolicyStatus = 'ACTIVE' | 'RENEW_TODAY' | 'EXPIRED' | 'NO_POLICY';

export type PayoutStatus = 'PAID' | 'PENDING' | 'FAILED';

export interface PayoutRecord {
  id: string;
  amount: number;
  status: PayoutStatus;
  date: string;
  type: string;
}

export interface DisruptionEvent {
  id: string;
  type: 'Weather' | 'Platform Downtime';
  date: string;
  payoutTriggered: boolean;
  amount?: number;
}

export interface UserProfile {
  phone: string;
  name: string;
  platform: Platform | null;
  partnerId: string;
  upiId: string;
  language: Language;
  tenureWeeks: number;
  avgWeeklyEarnings: number;
  onboarded: boolean;
}

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}
