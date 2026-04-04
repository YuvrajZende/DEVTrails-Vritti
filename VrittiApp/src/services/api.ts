import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const CACHE_PREFIX = '@vritti_cache_';
const normalizeApiBase = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  let next = value.trim();
  if (!next) {
    return '';
  }

  if (/^http:[^/]/i.test(next)) {
    next = next.replace(/^http:/i, 'http://');
  } else if (/^https:[^/]/i.test(next)) {
    next = next.replace(/^https:/i, 'https://');
  } else if (!/^https?:\/\//i.test(next)) {
    next = `http://${next}`;
  }

  return next.replace(/\/+$/, '');
};

const isIgnoredHost = (host: string): boolean =>
  /^172\.27\./.test(host) || /^172\.28\./.test(host) || /^172\.29\./.test(host);

const buildApiBaseFromHost = (host?: string | null): string | null => {
  const cleanedHost = host?.trim();
  if (!cleanedHost || isIgnoredHost(cleanedHost)) {
    return null;
  }

  return normalizeApiBase(`http://${cleanedHost}:3000`);
};

const configApiBase =
  typeof Constants.expoConfig?.extra?.apiBase === 'string'
    ? normalizeApiBase(Constants.expoConfig.extra.apiBase)
    : '';
const MANUAL_API_BASE = normalizeApiBase(process.env.EXPO_PUBLIC_API_BASE) || configApiBase || '';
let activeApiBase = MANUAL_API_BASE;

const getBundleDerivedApiBase = (): string | null => {
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (typeof hostUri === 'string') {
    const hostMatch = hostUri.match(/^(?:https?:\/\/)?([^/:]+)/i);
    const host = hostMatch?.[1]?.trim();
    const derived = buildApiBaseFromHost(host);
    if (derived) {
      return derived;
    }
  }

  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (typeof scriptURL !== 'string') {
    return null;
  }

  const match = scriptURL.match(/^https?:\/\/([^/:]+)/i);
  return buildApiBaseFromHost(match?.[1]);
};

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const getApiBaseCandidates = (): string[] =>
  uniqueStrings([
    activeApiBase,
    MANUAL_API_BASE,
    getBundleDerivedApiBase(),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

const isNetworkError = (err: any) => !err?.response;

const formatApiError = (err: any, attemptedBase?: string): Error => {
  if (err?.response?.data?.error) {
    return new Error(err.response.data.error);
  }

  if (isNetworkError(err)) {
    const base = attemptedBase || getApiBaseCandidates()[0] || 'http://localhost:3000';
    return new Error(
      `Cannot reach backend at ${base}. Start the backend or set EXPO_PUBLIC_API_BASE to the correct host.`
    );
  }

  return new Error(err?.message || 'Request failed');
};

const requestWithFallback = async <T>(request: (base: string) => Promise<T>): Promise<T> => {
  const candidates = getApiBaseCandidates();
  let lastError: any;

  for (const base of candidates) {
    try {
      const result = await request(base);
      activeApiBase = base;
      return result;
    } catch (err: any) {
      lastError = err;
      if (!isNetworkError(err)) {
        throw formatApiError(err, base);
      }
    }
  }

  throw formatApiError(lastError, candidates[0]);
};

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

export type PolicyStatus = 'ACTIVE' | 'RENEW_TODAY' | 'EXPIRED' | 'NO_POLICY';

export interface PolicyStatusResponse {
  status: PolicyStatus;
  premium_amount: number;
  coverage_cap: number;
  renewal_date: string | null;
  last_payout: { amount: number; paid_at: string } | null;
}

export interface PayoutRecord {
  payout_id: string;
  amount: number;
  trigger_id: string;
  paid_at: string | null;
  status: string;
}

export interface PayoutHistoryResponse {
  worker_id: string;
  payouts: PayoutRecord[];
}

const cacheSet = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch (err) {
    console.warn('Cache set failed:', err);
  }
};

const cacheGet = async <T>(key: string): Promise<{ data: T; ts: number } | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const workerOnboard = async (req: OnboardRequest): Promise<OnboardResponse> => {
  try {
    const response = await requestWithFallback((base) =>
      axios.post(`${base}/worker/onboard`, {
        phone: req.phone,
        name: req.name,
        platform: req.platform,
        partner_id: req.partner_id,
        zone_id: req.zone_id || 'VAD-04',
        device_fingerprint: req.device_fingerprint,
        upi_id: req.upi_id,
        language: req.language || 'hi',
        tenure_weeks: req.tenure_weeks || 0,
        avg_weekly_earnings: req.avg_weekly_earnings || 0,
      }, { timeout: 10000 })
    );

    const res = response.data;
    await AsyncStorage.setItem('@vritti_worker_id', res.worker_id);
    await cacheSet('worker_profile', res);

    return {
      worker_id: res.worker_id,
      risk_score: res.risk_score,
      premium_tier: res.premium_tier,
      coverage_cap: res.coverage_cap,
    };
  } catch (err: any) {
    if (err.response?.status === 409 && err.response?.data?.worker_id) {
      const existingData = err.response.data;
      await AsyncStorage.setItem('@vritti_worker_id', existingData.worker_id);
      await cacheSet('worker_profile', existingData);

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
    const response = await requestWithFallback((base) =>
      axios.post(`${base}/policy/activate`, {
        worker_id,
        payment_reference,
        premium,
        coverage_cap,
        risk_score,
      }, { timeout: 10000 })
    );

    const res = response.data;
    await cacheSet('active_policy', res);

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
    const response = await requestWithFallback((base) =>
      axios.get(`${base}/policy/status/${worker_id}`, { timeout: 10000 })
    );
    const res = response.data;

    await cacheSet('policy_status', res);

    return {
      status: res.status,
      premium_amount: res.premium_amount || 0,
      coverage_cap: res.coverage_cap || 0,
      renewal_date: res.renewal_date,
      last_payout: res.last_payout,
    };
  } catch (err: any) {
    console.error('Policy status API failed, trying cache:', err.message);
    const cached = await cacheGet<PolicyStatusResponse>('policy_status');
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
    const response = await requestWithFallback((base) =>
      axios.get<PayoutHistoryResponse>(`${base}/payout/history/${worker_id}`, { timeout: 10000 })
    );

    const payouts = response.data.payouts || [];
    await cacheSet('payout_history', payouts);
    return payouts;
  } catch (err: any) {
    console.error('Payout history API failed, trying cache:', err.message);
    const cached = await cacheGet<PayoutRecord[]>('payout_history');
    if (cached) {
      return cached.data;
    }
    return [];
  }
};

export const getCacheTimestamp = async (key: string): Promise<number | null> => {
  const cached = await cacheGet(key);
  return cached ? cached.ts : null;
};

export const clearCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (err) {
    console.error('Failed to clear cache:', err);
  }
};

export const getApiBase = () => activeApiBase || getApiBaseCandidates()[0] || 'http://localhost:3000';

export const testConnection = async (): Promise<boolean> => {
  try {
    const response = await requestWithFallback((base) =>
      axios.get(`${base}/health`, { timeout: 5000 })
    );
    return response.data?.status === 'healthy';
  } catch (err) {
    console.error('API connection test failed:', err);
    return false;
  }
};

export const signup = async (phone: string, password: string): Promise<any> => {
  try {
    const response = await requestWithFallback((base) =>
      axios.post(`${base}/auth/signup`, { phone, password }, { timeout: 10000 })
    );
    return response.data;
  } catch (err: any) {
    console.error('Signup failed:', err.message);
    throw formatApiError(err);
  }
};

export const verifyOTP = async (phone: string, otp_code: string): Promise<any> => {
  try {
    const response = await requestWithFallback((base) =>
      axios.post(`${base}/auth/verify-otp`, { phone, otp_code }, { timeout: 10000 })
    );
    return response.data;
  } catch (err: any) {
    console.error('OTP verification failed:', err.message);
    throw formatApiError(err);
  }
};

export const resendOTP = async (phone: string): Promise<any> => {
  try {
    const response = await requestWithFallback((base) =>
      axios.post(`${base}/auth/resend-otp`, { phone }, { timeout: 10000 })
    );
    return response.data;
  } catch (err: any) {
    console.error('Resend OTP failed:', err.message);
    throw formatApiError(err);
  }
};

export const login = async (phone: string, password: string): Promise<any> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await requestWithFallback((base) =>
        axios.post(`${base}/auth/login`, { phone, password }, { timeout: 10000 })
      );

      const { token, user, worker } = response.data;
      await AsyncStorage.setItem('@vritti_auth_token', token);
      await AsyncStorage.setItem('@vritti_user', JSON.stringify(user));

      if (worker) {
        await AsyncStorage.setItem('@vritti_worker_id', worker.id);
        await AsyncStorage.setItem('@vritti_onboarded', 'true');
      }

      return response.data;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error;
      if (errorMessage === 'Phone not verified' && attempt < 2) {
        await sleep(1500);
        continue;
      }

      console.error('Login failed:', err.message);
      throw formatApiError(err);
    }
  }

  throw new Error('Login failed');
};

export const logout = async (): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem('@vritti_auth_token');
    if (token) {
      await requestWithFallback((base) =>
        axios.post(`${base}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        })
      );
    }

    await AsyncStorage.multiRemove([
      '@vritti_auth_token',
      '@vritti_user',
      '@vritti_worker_id',
      '@vritti_onboarded',
    ]);
  } catch (err) {
    console.error('Logout failed:', err);
    await AsyncStorage.multiRemove([
      '@vritti_auth_token',
      '@vritti_user',
      '@vritti_worker_id',
      '@vritti_onboarded',
    ]);
  }
};

export const getCurrentUser = async (): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem('@vritti_auth_token');
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await requestWithFallback((base) =>
      axios.get(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      })
    );

    return response.data;
  } catch (err: any) {
    console.error('Get current user failed:', err.message);
    throw formatApiError(err);
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('@vritti_auth_token');
    return !!token;
  } catch {
    return false;
  }
};
