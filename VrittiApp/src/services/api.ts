import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@vritti_cache_';

// ─── Types ───
export interface OnboardRequest {
  phone: string;
  name?: string;
  platform: string;
  partner_id: string;
  zone_id?: string;
  device_fingerprint?: string;
  upi_id?: string;
}

export interface OnboardResponse {
  worker_id: string;
  risk_score: number;
  premium_tier: number;
  coverage_cap: number;
}

export interface ActivateResponse {
  policy_id: string;
  week_start: string;
  week_end: string;
  coverage_cap: number;
}

export type PolicyStatus = 'ACTIVE' | 'RENEW_TODAY' | 'EXPIRED';

export interface PolicyStatusResponse {
  status: PolicyStatus;
  coverage_cap: number;
  renewal_date: string;
  last_payout: { amount: number; date: string } | null;
}

export interface PayoutRecord {
  amount: number;
  trigger_id: string;
  trigger_type: 'rain' | 'aqi' | 'heat' | 'curfew';
  paid_at: string;
  status: 'paid' | 'pending' | 'held';
}

// ─── Cache helpers ───
const cacheSet = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
};

const cacheGet = async <T>(key: string): Promise<{ data: T; ts: number } | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ─── Mock delay ───
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── API_BASE_URL — swap after March 30 ───
// const API_BASE = 'https://nevil-api.example.com';

// ─── Mock API Endpoints ───

export const workerOnboard = async (req: OnboardRequest): Promise<OnboardResponse> => {
  await delay(800);
  const res: OnboardResponse = {
    worker_id: 'WRK-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    risk_score: 0.42,
    premium_tier: 49,
    coverage_cap: 800,
  };
  await AsyncStorage.setItem('@vritti_worker_id', res.worker_id);
  return res;
};

export const policyActivate = async (
  worker_id: string,
  payment_reference: string
): Promise<ActivateResponse> => {
  await delay(600);
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  return {
    policy_id: 'POL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    week_start: now.toISOString().split('T')[0],
    week_end: weekEnd.toISOString().split('T')[0],
    coverage_cap: 800,
  };
};

export const getPolicyStatus = async (worker_id: string): Promise<PolicyStatusResponse> => {
  try {
    await delay(400);
    const res: PolicyStatusResponse = {
      status: 'ACTIVE',
      coverage_cap: 800,
      renewal_date: (() => {
        const d = new Date();
        d.setDate(d.getDate() + (7 - d.getDay())); // next Sunday
        return d.toISOString().split('T')[0];
      })(),
      last_payout: { amount: 800, date: '2026-03-17' },
    };
    await cacheSet('policy_status', res);
    return res;
  } catch {
    const cached = await cacheGet<PolicyStatusResponse>('policy_status');
    if (cached) return cached.data;
    throw new Error('No network and no cached data');
  }
};

export const getPayoutHistory = async (worker_id: string): Promise<PayoutRecord[]> => {
  try {
    await delay(400);
    const res: PayoutRecord[] = [
      { amount: 800, trigger_id: 'T001', trigger_type: 'rain', paid_at: '2026-03-17', status: 'paid' },
      { amount: 600, trigger_id: 'T002', trigger_type: 'aqi', paid_at: '2026-03-10', status: 'paid' },
      { amount: 800, trigger_id: 'T003', trigger_type: 'heat', paid_at: '2026-03-03', status: 'paid' },
      { amount: 400, trigger_id: 'T004', trigger_type: 'curfew', paid_at: '2026-02-24', status: 'paid' },
    ];
    await cacheSet('payout_history', res);
    return res;
  } catch {
    const cached = await cacheGet<PayoutRecord[]>('payout_history');
    if (cached) return cached.data;
    return [];
  }
};

export const getCacheTimestamp = async (key: string): Promise<number | null> => {
  const cached = await cacheGet(key);
  return cached ? cached.ts : null;
};
