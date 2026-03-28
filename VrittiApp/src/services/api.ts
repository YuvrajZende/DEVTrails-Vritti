import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── API Base URL ───
// Use your machine's LAN IP (same network as your phone running Expo Go)
// This should match the IP in Metro's exp:// URL  
const API_BASE = 'http://10.74.4.84:3000';
// const API_BASE = 'http://10.0.2.2:3000'; // Android emulator only
// const API_BASE = 'https://your-app.railway.app'; // Production

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
  language?: string;
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

export type PolicyStatus = 'ACTIVE' | 'RENEW_TODAY' | 'EXPIRED' | 'NO_POLICY';

export interface PolicyStatusResponse {
  status: PolicyStatus;
  coverage_cap: number;
  renewal_date: string;
  last_payout: { amount: number; paid_at: string } | null;
}

export interface PayoutRecord {
  amount: number;
  trigger_id: string;
  paid_at: string;
  status: string;
}

// ─── Cache helpers ───
const cacheSet = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch { }
};

const cacheGet = async <T>(key: string): Promise<{ data: T; ts: number } | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ─── API Endpoints ───

export const workerOnboard = async (req: OnboardRequest): Promise<OnboardResponse> => {
  try {
    const response = await axios.post(`${API_BASE}/worker/onboard`, {
      phone: req.phone,
      name: req.name,
      platform: req.platform,
      partner_id: req.partner_id,
      zone_id: req.zone_id || 'VAD-04', // Default zone for demo
      device_fingerprint: req.device_fingerprint,
      upi_id: req.upi_id,
      language: req.language,
    }, { timeout: 10000 });

    const res = response.data;
    await AsyncStorage.setItem('@vritti_worker_id', res.worker_id);
    return res;
  } catch (err: any) {
    // If worker already exists (409), extract worker_id from error response
    if (err.response?.status === 409 && err.response?.data?.worker_id) {
      await AsyncStorage.setItem('@vritti_worker_id', err.response.data.worker_id);
      return {
        worker_id: err.response.data.worker_id,
        risk_score: 0.40,
        premium_tier: 49,
        coverage_cap: 800,
      };
    }
    console.error('Onboard API failed:', err.message);
    throw err;
  }
};

export const policyActivate = async (
  worker_id: string,
  payment_reference: string,
  premium?: number,
  coverage_cap?: number,
  risk_score?: number
): Promise<ActivateResponse> => {
  try {
    const response = await axios.post(`${API_BASE}/policy/activate`, {
      worker_id,
      payment_reference,
      premium,
      coverage_cap,
      risk_score
    }, { timeout: 10000 });

    return response.data;
  } catch (err: any) {
    console.error('Policy activate API failed:', err.message);
    throw err;
  }
};

export const getPolicyStatus = async (worker_id: string): Promise<PolicyStatusResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/policy/status/${worker_id}`, { timeout: 10000 });
    const res = response.data;
    await cacheSet('policy_status', res);
    return res;
  } catch (err: any) {
    console.error('Policy status API failed, trying cache:', err.message);
    const cached = await cacheGet<PolicyStatusResponse>('policy_status');
    if (cached) return cached.data;
    // Return safe default if no cache
    return {
      status: 'NO_POLICY',
      coverage_cap: 0,
      renewal_date: '',
      last_payout: null,
    };
  }
};

export const getPayoutHistory = async (worker_id: string): Promise<PayoutRecord[]> => {
  try {
    const response = await axios.get(`${API_BASE}/payout/history/${worker_id}`, { timeout: 10000 });
    const payouts = response.data.payouts || [];
    await cacheSet('payout_history', payouts);
    return payouts;
  } catch (err: any) {
    console.error('Payout history API failed, trying cache:', err.message);
    const cached = await cacheGet<PayoutRecord[]>('payout_history');
    if (cached) return cached.data;
    return [];
  }
};

export const getCacheTimestamp = async (key: string): Promise<number | null> => {
  const cached = await cacheGet(key);
  return cached ? cached.ts : null;
};

// ─── Helper: Get API base URL ───
export const getApiBase = () => API_BASE;
