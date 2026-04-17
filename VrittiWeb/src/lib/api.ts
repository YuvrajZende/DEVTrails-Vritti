import axios from 'axios';
import { PayoutRecord, PolicyStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const CACHE_PREFIX = '@vritti_web_cache_';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('@vritti_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface OnboardRequest {
  phone: string;
  name?: string;
  platform: string;
  partner_id: string;
  zone_id?: string;
  device_fingerprint?: string;
  upi_id?: string;
  language?: string;
  tenure_weeks?: number;
  avg_weekly_earnings?: number;
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

export interface PolicyStatusResponse {
  status: PolicyStatus;
  premium_amount: number;
  coverage_cap: number;
  renewal_date: string | null;
  last_payout: { amount: number; paid_at: string } | null;
}

export interface PayoutHistoryResponse {
  worker_id: string;
  payouts: PayoutRecord[];
}

const cacheSet = (key: string, data: any) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch (err) {
    console.warn('Cache set failed:', err);
  }
};

const cacheGet = <T>(key: string): { data: T; ts: number } | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const formatApiError = (err: any): any => {
  const data = err?.response?.data;
  if (data) {
    const error: any = new Error(data.error || 'Request failed');
    // Preserve extra fields from backend (requires_verification, worker_id, etc.)
    Object.keys(data).forEach(key => {
      if (key !== 'error') error[key] = data[key];
    });
    return error;
  }
  return new Error(err?.message || 'Request failed');
};

export const workerOnboard = async (req: OnboardRequest): Promise<OnboardResponse> => {
  try {
    const response = await axios.post(`${API_BASE}/worker/onboard`, {
      phone: req.phone,
      name: req.name,
      platform: req.platform,
      partner_id: req.partner_id,
      zone_id: req.zone_id || 'VAD-04',
      device_fingerprint: req.device_fingerprint || 'web-browser',
      upi_id: req.upi_id,
      language: req.language || 'en',
      tenure_weeks: req.tenure_weeks || 0,
      avg_weekly_earnings: req.avg_weekly_earnings || 0,
    }, { timeout: 10000 });

    const res = response.data;
    localStorage.setItem('@vritti_worker_id', res.worker_id);
    cacheSet('worker_profile', res);

    return {
      worker_id: res.worker_id,
      risk_score: res.risk_score,
      premium_tier: res.premium_tier,
      coverage_cap: res.coverage_cap,
    };
  } catch (err: any) {
    if (err.response?.status === 409 && err.response?.data?.worker_id) {
      const existingData = err.response.data;
      localStorage.setItem('@vritti_worker_id', existingData.worker_id);
      cacheSet('worker_profile', existingData);

      return {
        worker_id: existingData.worker_id,
        risk_score: existingData.risk_score || 0.4,
        premium_tier: existingData.premium_tier || 49,
        coverage_cap: existingData.coverage_cap || 800,
      };
    }
    console.error('Onboard API failed:', err.message);
    throw formatApiError(err);
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
      risk_score,
    }, { timeout: 10000 });

    const res = response.data;
    cacheSet('active_policy', res);

    return {
      policy_id: res.policy_id,
      week_start: res.week_start,
      week_end: res.week_end,
      coverage_cap: res.coverage_cap,
    };
  } catch (err: any) {
    console.error('Policy activate API failed:', err.message);
    throw formatApiError(err);
  }
};

export const getPolicyStatus = async (worker_id: string): Promise<PolicyStatusResponse> => {
  try {
    const response = await axios.get(`${API_BASE}/policy/status/${worker_id}`, { timeout: 10000 });
    const res = response.data;

    cacheSet('policy_status', res);

    return {
      status: res.status,
      premium_amount: res.premium_amount || 0,
      coverage_cap: res.coverage_cap || 0,
      renewal_date: res.renewal_date,
      last_payout: res.last_payout,
    };
  } catch (err: any) {
    console.error('Policy status API failed, trying cache:', err.message);
    const cached = cacheGet<PolicyStatusResponse>('policy_status');
    if (cached) {
      return cached.data;
    }

    return {
      status: 'NO_POLICY',
      premium_amount: 0,
      coverage_cap: 0,
      renewal_date: null,
      last_payout: null,
    };
  }
};

export const getPayoutHistory = async (worker_id: string): Promise<PayoutRecord[]> => {
  try {
    const response = await axios.get<PayoutHistoryResponse>(`${API_BASE}/payout/history/${worker_id}`, { timeout: 10000 });
    
    // Map backend response fields to match the web app's `PayoutRecord` shape
    const derivePayoutType = (triggerId: string): string => {
      if (!triggerId) return 'Weather';
      if (triggerId.startsWith('T4')) return 'Curfew';
      if (triggerId.startsWith('T5')) return 'Platform';
      return 'Weather'; // T1 rain, T2 heat, T3 AQI are all weather-related
    };

    const payouts: PayoutRecord[] = (response.data.payouts || []).map((p: any) => ({
      id: p.payout_id || Math.random().toString(),
      amount: p.amount,
      status: p.status, 
      date: p.paid_at ? p.paid_at.split('T')[0] : 'Pending',
      type: derivePayoutType(p.trigger_id),
      breakdown: p.breakdown
    }));

    cacheSet('payout_history', payouts);
    return payouts;
  } catch (err: any) {
    console.error('Payout history API failed, trying cache:', err.message);
    const cached = cacheGet<PayoutRecord[]>('payout_history');
    if (cached) {
      return cached.data;
    }
    return [];
  }
};

export const getCacheTimestamp = (key: string): number | null => {
  const cached = cacheGet(key);
  return cached ? cached.ts : null;
};

export const signup = async (phone: string, password: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE}/auth/signup`, { phone, password }, { timeout: 10000 });
    return response.data;
  } catch (err: any) {
    console.error('Signup failed:', err.message);
    throw formatApiError(err);
  }
};

export const login = async (phone: string, password: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { phone, password }, { timeout: 10000 });
    
    const { token, user, worker } = response.data;
    localStorage.setItem('@vritti_auth_token', token);
    localStorage.setItem('@vritti_user', JSON.stringify(user));

    if (worker) {
      localStorage.setItem('@vritti_worker_id', worker.id);
    }
    
    return response.data;
  } catch (err: any) {
    console.error('Login failed:', err.message);
    throw formatApiError(err);
  }
};

export const logout = () => {
    localStorage.removeItem('@vritti_auth_token');
    localStorage.removeItem('@vritti_user');
    localStorage.removeItem('@vritti_worker_id');
    localStorage.removeItem(CACHE_PREFIX + 'policy_status');
    localStorage.removeItem(CACHE_PREFIX + 'payout_history');
    localStorage.removeItem(CACHE_PREFIX + 'worker_profile');
    localStorage.removeItem(CACHE_PREFIX + 'active_policy');
};

export const getMe = async (): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE}/auth/me`, { timeout: 10000 });
    const { user, worker } = response.data;
    if (user) localStorage.setItem('@vritti_user', JSON.stringify(user));
    if (worker) localStorage.setItem('@vritti_worker_id', worker.id);
    return response.data;
  } catch (err: any) {
    console.error('getMe failed:', err.message);
    throw formatApiError(err);
  }
};

export const verifyOTP = async (phone: string, otp_code: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE}/auth/verify-otp`, { phone, otp_code }, { timeout: 10000 });
    return response.data;
  } catch (err: any) {
    console.error('OTP verification failed:', err.message);
    throw formatApiError(err);
  }
};

export const resendOTP = async (phone: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE}/auth/resend-otp`, { phone }, { timeout: 10000 });
    return response.data;
  } catch (err: any) {
    console.error('Resend OTP failed:', err.message);
    throw formatApiError(err);
  }
};

export const triggerDisruption = async (zone_id: string, trigger_id: string, severity: string = 'HIGH'): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE}/admin/override`, {
      zone_id,
      trigger_id,
      severity,
    }, { timeout: 15000 });
    return response.data;
  } catch (err: any) {
    console.error('Trigger disruption failed:', err.message);
    throw formatApiError(err);
  }
};
