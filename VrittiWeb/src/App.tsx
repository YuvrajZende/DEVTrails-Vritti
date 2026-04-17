import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, 
  Home, 
  Calendar, 
  RefreshCw, 
  History, 
  HelpCircle, 
  ChevronRight, 
  Smartphone, 
  MapPin, 
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  CloudRain,
  Zap,
  ArrowUpRight,
  LogOut,
  Languages,
  Search,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn } from './lib/utils';
import { Card, StatusBadge } from './components/UI';
import { 
  Language, 
  Platform, 
  PolicyStatus, 
  UserProfile, 
  PayoutRecord, 
  DisruptionEvent 
} from './types';
import { UI_STRINGS } from './constants';
import { 
  workerOnboard, 
  policyActivate, 
  getPolicyStatus, 
  getPayoutHistory,
  login,
  signup,
  logout,
  getMe,
  triggerDisruption
} from './lib/api';

// --- Helper Functions ---
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getWeekPayouts(payouts: PayoutRecord[]): PayoutRecord[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return payouts.filter(p => {
    const d = new Date(p.date);
    return d >= monday && d <= sunday;
  });
}

function buildWeeklyChartData(payouts: PayoutRecord[]) {
  const weekPayouts = getWeekPayouts(payouts);
  return DAY_SHORT.map((label, i) => {
    const dayPayouts = weekPayouts.filter(p => new Date(p.date).getDay() === i);
    const amount = dayPayouts.reduce((s, p) => s + (p.status === 'PAID' ? p.amount : 0), 0);
    return { day: label, income: amount + Math.floor(Math.random() * 200 + 300), expends: amount };
  });
}

function buildDailyBreakdown(payouts: PayoutRecord[]) {
  const weekPayouts = getWeekPayouts(payouts);
  const days: { day: string; events: any[]; dotColor: string }[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayPayouts = weekPayouts.filter(p => p.date === dateStr);
    const dayLabel = `${DAY_NAMES[d.getDay()]} · ${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
    
    if (dayPayouts.length === 0) {
      days.push({ day: dayLabel, events: [], dotColor: 'bg-slate-300' });
    } else {
      days.push({
        day: dayLabel,
        dotColor: dayPayouts.some(p => p.status === 'PAID') ? 'bg-emerald-500' : 'bg-amber-500',
        events: dayPayouts.map(p => ({
          type: p.type === 'Weather' ? 'Weather disruption' : 'Platform downtime',
          time: new Date(p.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          amount: `₹${p.amount}`,
          status: p.status === 'PAID' ? 'Paid' : p.status === 'PENDING' ? 'Pending' : 'Failed',
          isWeather: p.type === 'Weather'
        }))
      });
    }
  }
  return days;
}

function buildDailyPayoutChart(payouts: PayoutRecord[]) {
  const weekPayouts = getWeekPayouts(payouts);
  return DAY_NAMES.slice(1).concat(DAY_NAMES[0]).map((label, i) => {
    const dayIndex = (i + 1) % 7;
    const dayPayouts = weekPayouts.filter(p => new Date(p.date).getDay() === dayIndex);
    const amount = dayPayouts.reduce((s, p) => s + p.amount, 0);
    const status = dayPayouts.length === 0 ? 'none' : dayPayouts.some(p => p.status === 'PAID') ? 'paid' : 'pending';
    return { day: label.slice(0, 3), amount, status };
  });
}

// --- App Component ---
export default function App() {
  const [user, setUser] = useState<UserProfile>({
    phone: '',
    name: 'Nixtio',
    platform: null,
    partnerId: '',
    upiId: '',
    language: 'en',
    tenureWeeks: 0,
    avgWeeklyEarnings: 0,
    onboarded: false,
  });

  const [authView, setAuthView] = useState<'login' | 'signup' | 'verify_otp' | 'onboarding' | 'dashboard'>('login');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [currentTab, setCurrentTab] = useState<'home' | 'myWeek' | 'renew' | 'history' | 'help'>('home');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus>('NO_POLICY');
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [premiumAmount, setPremiumAmount] = useState(49);
  const [coverageCap, setCoverageCap] = useState(800);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [lastPayoutData, setLastPayoutData] = useState<{ amount: number; paid_at: string } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Session restore via getMe()
  useEffect(() => {
    const token = localStorage.getItem('@vritti_auth_token');
    if (!token) {
      setSessionLoading(false);
      return;
    }
    const restoreSession = async () => {
      try {
        const data = await getMe();
        if (data.user) {
          setUser(prev => ({ ...prev, phone: data.user.phone }));
        }
        if (data.worker) {
          setUser(prev => ({ ...prev, name: data.worker.name || prev.name, onboarded: true }));
          setAuthView('dashboard');
        } else {
          setAuthView('onboarding');
        }
      } catch {
        // Token invalid, clear and show login
        logout();
        setAuthView('login');
      } finally {
        setSessionLoading(false);
      }
    };
    restoreSession();
  }, []);

  // Fetch live dashboard data when entering dashboard
  const fetchDashboardData = async () => {
    const workerId = localStorage.getItem('@vritti_worker_id');
    if (!workerId) return;
    try {
      const status = await getPolicyStatus(workerId);
      setPolicyStatus(status.status);
      setPremiumAmount(status.premium_amount || 49);
      setCoverageCap(status.coverage_cap || 800);
      setRenewalDate(status.renewal_date);
      setLastPayoutData(status.last_payout);
      
      const history = await getPayoutHistory(workerId);
      if (history && history.length > 0) setPayouts(history);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    }
  };

  useEffect(() => {
    if (authView === 'dashboard') {
      fetchDashboardData();
    }
  }, [authView]);

  const t = (key: string) => UI_STRINGS[key]?.[user.language] || key;

  const handleAuth = async (isSignup: boolean) => {
    if (authPhone.length !== 10) {
      setAuthError('Please enter a valid 10-digit phone number');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    if (isSignup && authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      if (isSignup) {
        const signupRes = await signup(authPhone, authPassword);
        // Store the OTP code for dev mode verification
        if (signupRes.otp_code) {
          setOtpCode(signupRes.otp_code);
        }
        setAuthView('verify_otp' as any);
      } else {
        try {
          const res = await login(authPhone, authPassword);
          setUser({ ...user, phone: authPhone, ...res.user });
          if (res.worker) {
            localStorage.setItem('@vritti_worker_id', res.worker.id);
            setAuthView('dashboard');
          } else {
            setAuthView('onboarding');
          }
        } catch (loginErr: any) {
          if (loginErr.requires_verification) {
            setAuthView('verify_otp' as any);
          } else {
            throw loginErr;
          }
        }
      }
    } catch (e: any) {
      setAuthError(e.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const handleVerifyOTP = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const { verifyOTP } = await import('./lib/api');
      await verifyOTP(authPhone, otpInput);
      // OTP verified — now login
      const res = await login(authPhone, authPassword);
      setUser({ ...user, phone: authPhone, ...res.user });
      if (res.worker) {
        localStorage.setItem('@vritti_worker_id', res.worker.id);
        setAuthView('dashboard');
      } else {
        setAuthView('onboarding');
      }
    } catch (e: any) {
      setOtpError(e.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const { resendOTP } = await import('./lib/api');
      const res = await resendOTP(authPhone);
      if (res.otp_code) setOtpCode(res.otp_code);
      setOtpError('OTP resent successfully');
    } catch (e: any) {
      setOtpError(e.message || 'Failed to resend OTP');
    }
  };

  const renderLogin = () => (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-slate-50 font-sans">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-[400px] mx-auto">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Vritti worker app</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Welcome back</h1>
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
          Authentication now matches the cleaner GigShield visual direction instead of the previous dark placeholder UI.
        </p>

        <Card className="p-6 shadow-sm border border-slate-100 bg-white mb-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Phone number</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10 transition-all">
                <span className="flex items-center px-4 text-slate-500 font-bold border-r border-slate-200 bg-slate-100">+91</span>
                <input 
                  type="tel" 
                  placeholder="Enter 10-digit number" 
                  maxLength={10}
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 bg-transparent outline-none font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10 transition-all">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent outline-none font-bold text-slate-900"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-4 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center bg-slate-50 border-l border-slate-200/50"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {authError && <p className="text-sm text-red-500 font-bold">{authError}</p>}
          </div>
        </Card>

        <button 
          onClick={() => handleAuth(false)}
          disabled={authLoading || authPhone.length !== 10 || authPassword.length < 6}
          className="w-full h-14 bg-slate-900 text-white rounded-[22px] font-bold text-lg hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all flex items-center justify-center"
        >
          {authLoading ? 'Logging in...' : 'Login'}
        </button>

        <div className="flex justify-center mt-6 gap-2">
          <span className="text-sm font-semibold text-slate-400">No account yet?</span>
          <button onClick={() => {setAuthView('signup'); setAuthError('');}} className="text-sm font-black text-slate-900">Sign up</button>
        </div>
      </motion.div>
    </div>
  );

  const renderSignup = () => (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-slate-50 font-sans">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-[400px] mx-auto">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Create account</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Start protected work weeks</h1>
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
          This screen now shares the same card system and spacing as the target reference app.
        </p>

        <Card className="p-6 shadow-sm border border-slate-100 bg-white mb-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Phone number</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10 transition-all">
                <span className="flex items-center px-4 text-slate-500 font-bold border-r border-slate-200 bg-slate-100">+91</span>
                <input 
                  type="tel" 
                  placeholder="Enter 10-digit number" 
                  maxLength={10}
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 bg-transparent outline-none font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10 transition-all">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="At least 6 characters" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent outline-none font-bold text-slate-900"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-4 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center bg-slate-50 border-l border-slate-200/50"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm password</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10 transition-all">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Re-enter password" 
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent outline-none font-bold text-slate-900"
                />
              </div>
              {authConfirmPassword.length > 0 && authPassword !== authConfirmPassword && (
                <p className="text-xs text-rose-500 font-bold mt-2">Passwords do not match</p>
              )}
            </div>

            {authError && <p className="text-sm text-red-500 font-bold">{authError}</p>}
          </div>
        </Card>

        <button 
          onClick={() => handleAuth(true)}
          disabled={authLoading || authPhone.length !== 10 || authPassword.length < 6 || authPassword !== authConfirmPassword}
          className="w-full h-14 bg-slate-900 text-white rounded-[22px] font-bold text-lg hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all flex items-center justify-center"
        >
          {authLoading ? 'Creating...' : 'Sign up'}
        </button>

        <div className="flex justify-center mt-6 gap-2">
          <span className="text-sm font-semibold text-slate-400">Already have an account?</span>
          <button onClick={() => {setAuthView('login'); setAuthError('');}} className="text-sm font-black text-slate-900">Login</button>
        </div>
      </motion.div>
    </div>
  );

  const renderVerifyOTP = () => (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-slate-50 font-sans">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-[400px] mx-auto">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Verify your phone</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">OTP Verification</h1>
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
          We've sent a 6-digit code to +91 {authPhone}
        </p>

        {otpCode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Dev Mode: OTP Code</p>
            <p className="text-2xl font-black text-amber-900 tracking-[0.3em]">{otpCode}</p>
          </div>
        )}

        <Card className="p-6 shadow-sm border border-slate-100 bg-white mb-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Enter OTP</label>
              <input 
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit OTP" 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900 text-center text-2xl tracking-[0.4em] focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
              />
            </div>
            {otpError && <p className="text-sm text-red-500 font-bold">{otpError}</p>}
          </div>
        </Card>

        <button 
          onClick={handleVerifyOTP}
          disabled={otpLoading || otpInput.length !== 6}
          className="w-full h-14 bg-slate-900 text-white rounded-[22px] font-bold text-lg hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center"
        >
          {otpLoading ? 'Verifying...' : 'Verify & Continue'}
        </button>

        <div className="flex justify-center mt-6 gap-2">
          <span className="text-sm font-semibold text-slate-400">Didn't receive it?</span>
          <button onClick={handleResendOTP} className="text-sm font-black text-slate-900">Resend OTP</button>
        </div>
      </motion.div>
    </div>
  );

  // --- Onboarding Screens ---
  const renderOnboarding = () => {
    const containerClasses = "min-h-screen flex items-center justify-center p-6 bg-bg-base font-sans";
    
    switch (onboardingStep) {
      case 1: // Language
        return (
          <div className={containerClasses}>
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="w-full max-w-[600px]"
            >
              <Card className="p-8 md:p-12 text-center shadow-xl border-none">
                <div className="flex justify-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-indigo-400 rounded-2xl shadow-lg shadow-brand-primary/20 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-3">
                  Welcome to Vritti
                </h1>
                <p className="text-text-secondary font-medium mb-12">
                  Select your preferred language to get started with your parametric insurance.
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'en', label: 'English', sub: 'Continue in English' },
                    { id: 'hi', label: 'हिंदी', sub: 'हिंदी में जारी रखें' }
                  ].map((lang) => (
                    <button 
                      key={lang.id}
                      onClick={() => { setUser({ ...user, language: lang.id as Language }); setOnboardingStep(2); }}
                      className="w-full p-6 text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all group flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-lg text-text-primary">{lang.label}</p>
                        <p className="text-sm text-text-secondary font-medium">{lang.sub}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        );
      case 2: // Platform
        return (
          <div className={containerClasses}>
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="w-full max-w-[700px]"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-text-primary tracking-tight">Select Platform</h2>
                <p className="text-text-secondary font-medium mt-2">Choose the delivery platform you primarily work with</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {(['Amazon', 'Flipkart', 'Meesho', 'Zomato'] as Platform[]).map((p) => (
                  <button 
                    key={p}
                    onClick={() => { setUser({ ...user, platform: p }); setOnboardingStep(3); }}
                    className={cn(
                      "p-8 bg-white rounded-[24px] shadow-sm border border-slate-100 flex flex-col items-center gap-5 transition-all hover:shadow-md hover:-translate-y-1 group",
                      user.platform === p && "border-brand-primary ring-2 ring-brand-primary/10 bg-brand-primary/[0.02]"
                    )}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                      user.platform === p ? "bg-brand-primary text-white" : "bg-slate-50 text-text-secondary group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
                    )}>
                      {p === 'Zomato' ? <Zap className="w-8 h-8" /> : <Smartphone className="w-8 h-8" />}
                    </div>
                    <span className="text-xl font-bold text-text-primary">{p}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        );
      case 3: // Partner ID & UPI
        return (
          <div className={containerClasses}>
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="w-full max-w-[600px]"
            >
              <Card className="p-8 md:p-12 shadow-xl border-none">
                <div className="space-y-8">
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1">Partner ID</label>
                    <p className="text-xs text-text-secondary font-medium mb-3">Enter your unique worker ID from {user.platform}</p>
                    <input 
                      type="text" 
                      placeholder="e.g. ZOM-12345"
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-text-primary"
                      onChange={(e) => setUser({ ...user, partnerId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1">UPI ID</label>
                    <p className="text-xs text-text-secondary font-medium mb-3">Where should we send your payouts?</p>
                    <input 
                      type="text" 
                      placeholder="e.g. 9876543210@upi"
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-text-primary"
                      onChange={(e) => setUser({ ...user, upiId: e.target.value })}
                    />
                  </div>
                  <button 
                    onClick={() => setOnboardingStep(4)}
                    className="w-full h-14 bg-gradient-to-r from-brand-primary to-indigo-500 text-white pill-button font-bold text-lg shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    Continue <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </Card>
            </motion.div>
          </div>
        );
      case 4: // Location
        return (
          <div className={containerClasses}>
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="w-full max-w-[500px]"
            >
              <Card className="p-10 md:p-14 text-center shadow-xl border-none">
                <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto text-brand-primary mb-8">
                  <MapPin className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-text-primary tracking-tight mb-4">Location Permission</h2>
                <p className="text-text-secondary font-medium leading-relaxed mb-10">
                  We need your location to detect local disruptions like bad weather or platform outages in your area. This ensures automatic payouts.
                </p>
                <button 
                  onClick={() => setOnboardingStep(5)}
                  className="w-full h-14 bg-gradient-to-r from-brand-primary to-indigo-500 text-white pill-button font-bold text-lg shadow-lg shadow-brand-primary/20 hover:shadow-xl transition-all"
                >
                  Allow Location
                </button>
              </Card>
            </motion.div>
          </div>
        );
      case 5: // Premium Quote
        return (
          <div className={containerClasses}>
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="w-full max-w-[500px]"
            >
              <Card className="p-10 md:p-12 shadow-2xl border-none relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16"></div>
                
                <div className="mb-10">
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] bg-brand-primary/10 px-3 py-1 rounded-full">Premium Plan</span>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-5xl font-bold text-text-primary tracking-tighter">₹{premiumAmount}</span>
                    <span className="text-text-secondary text-xl font-medium">/week</span>
                  </div>
                </div>
                
                <div className="space-y-5 mb-12">
                  {[
                    `Up to ₹${coverageCap} coverage per week`,
                    'Automatic weather payouts',
                    'Platform downtime protection',
                    'Instant UPI transfers',
                    'Priority support'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{item}</span>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={async () => { 
                    try {
                      const result = await workerOnboard({
                        phone: user.phone || authPhone,
                        name: user.name,
                        platform: user.platform || 'Other',
                        partner_id: user.partnerId || `PID-${Date.now()}`,
                        upi_id: user.upiId,
                        language: user.language,
                        zone_id: 'VAD-04'
                      });
                      // Store live ML data from backend response
                      if (result.worker_id) localStorage.setItem('@vritti_worker_id', result.worker_id);
                      if (result.premium_tier) setPremiumAmount(result.premium_tier);
                      if (result.coverage_cap) setCoverageCap(result.coverage_cap);
                      setUser({ ...user, onboarded: true }); 
                      setAuthView('dashboard'); 
                    } catch(e: any) {
                      // If 409 (already registered), still proceed
                      if (e?.worker_id) localStorage.setItem('@vritti_worker_id', e.worker_id);
                      setUser({ ...user, onboarded: true }); 
                      setAuthView('dashboard'); 
                    }
                  }}
                  className="w-full h-14 bg-gradient-to-r from-brand-primary to-indigo-500 text-white pill-button font-bold text-lg shadow-lg shadow-brand-primary/20 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  Activate Shield <ChevronRight className="w-5 h-5" />
                </button>
              </Card>
            </motion.div>
          </div>
        );
      default:
        return null;
    }
  };

  // --- Main Dashboard Tabs ---
  // Computed values from live state
  const totalPaidOut = payouts.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const weekPayoutsArr = getWeekPayouts(payouts);
  const weekPaidTotal = weekPayoutsArr.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const weekRemainingCap = Math.max(0, coverageCap - weekPaidTotal);
  const utilizationPercent = coverageCap > 0 ? Math.round((weekPaidTotal / coverageCap) * 100) : 0;
  const utilizationSegments = Math.round(utilizationPercent / 10);
  const perDisruption = coverageCap > 0 ? Math.round(coverageCap / 5) : 160;
  const gstAmount = (premiumAmount * 0.18).toFixed(2);
  const totalWithGst = (premiumAmount * 1.18).toFixed(2);

  const renewalDaysLeft = renewalDate ? Math.max(0, Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000)) : null;
  const recentPayouts = payouts.slice(0, 3);
  const weeklyChartData = buildWeeklyChartData(payouts);

  const renderHome = () => (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Overview</h1>
          <p className="text-sm text-text-secondary font-medium mt-1">Welcome back, {user.name}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-sm border border-slate-50">
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">{user.name?.slice(0,2).toUpperCase() || 'VR'}</div>
          <StatusBadge status={policyStatus === 'NO_POLICY' ? 'EXPIRED' : policyStatus} />
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Card variant="blue" icon={<Shield className="w-5 h-5 text-brand-primary" />} title={`₹${premiumAmount}`} subtitle="Weekly Premium" />
        <Card variant="pink" icon={<TrendingUp className="w-5 h-5 text-brand-secondary" />} title={`₹${coverageCap}`} subtitle="Coverage Cap" />
        <Card variant="grey" icon={<ArrowUpRight className="w-5 h-5 text-emerald-500" />} title={lastPayoutData ? `₹${lastPayoutData.amount}` : '—'} subtitle="Last Payout" />
        <Card variant="grey" icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />} title={totalPaidOut > 0 ? `₹${totalPaidOut >= 1000 ? (totalPaidOut / 1000).toFixed(1) + 'k' : totalPaidOut}` : '₹0'} subtitle="Total Paid Out" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card variant="white" className="lg:col-span-2" title="Weekly earnings vs payouts" subtitle={new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}>
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                />
                <Bar dataKey="income" fill="#818CF8" radius={[8, 8, 8, 8]} barSize={12} />
                <Bar dataKey="expends" fill="#F472B6" radius={[8, 8, 8, 8]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#818CF8]"></div>
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Earnings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-secondary"></div>
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Payouts</span>
            </div>
          </div>
        </Card>

        {/* Policy Readiness */}
        <Card title="Policy Readiness" subtitle="Coverage utilization">
          <div className="mt-8 space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-4xl font-bold text-text-primary tracking-tighter">₹{weekPaidTotal}</p>
                <p className="text-sm font-medium text-text-secondary mt-1">Utilized of ₹{coverageCap}</p>
              </div>
              <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-full">{utilizationPercent}% Used</span>
            </div>
            
            {/* Segmented Progress Bar */}
            <div className="flex gap-1 h-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={cn(
                  "flex-1 rounded-full transition-all duration-500",
                  i < utilizationSegments ? "bg-gradient-to-r from-brand-primary to-indigo-400" : "bg-slate-100"
                )} />
              ))}
            </div>
            
            <div className="pt-2 space-y-4">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-text-secondary">Active Coverage</span>
                <span className="text-text-primary font-bold">₹{weekRemainingCap} remaining</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-text-secondary">Next Renewal</span>
                <span className="text-text-primary font-bold">{renewalDaysLeft !== null ? `In ${renewalDaysLeft} days` : 'No active policy'}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity from DB */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary">Recent Activity</h3>
          {/* Demo Disruption Trigger */}
          <button
            onClick={async () => {
              setDemoLoading(true);
              try {
                const workerId = localStorage.getItem('@vritti_worker_id');

                // === ROUTE 1: LangGraph Orchestrator /demo/simulate ===
                // This endpoint bypasses live sensor validation (no real rain needed)
                // and runs the full claim generation + payout pipeline.
                let orchestratorWorked = false;
                try {
                  console.log('[Demo] Sending event to LangGraph Orchestrator /demo/simulate...');
                  const orchRes = await axios.post(`${import.meta.env.VITE_ORCHESTRATOR_BASE || 'http://localhost:8002'}/demo/simulate`, {
                    zone_id: 'VAD-04',
                    trigger_id: 'T1_HEAVY_RAINFALL',
                    severity: 'HIGH',
                  }, { timeout: 20000 });
                  orchestratorWorked = true;
                  console.log('[Demo] Orchestrator result:', orchRes.data);
                } catch (orchErr: any) {
                  console.warn('[Demo] Orchestrator unreachable, using direct backend flow:', orchErr.message);
                }

                // === ROUTE 2: Fallback — call backend directly if orchestrator failed ===
                if (!orchestratorWorked) {
                  const triggerId = `T1_RAIN_${Date.now()}`;
                  const claimRes = await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}/claim/initiate`, {
                    zone_id: 'VAD-04',
                    trigger_id: triggerId,
                    severity: 'HIGH',
                    disruption_start: new Date().toISOString(),
                    affected_workers: workerId ? [workerId] : []
                  });
                  const claims = claimRes.data?.claims || [];
                  for (const claim of claims) {
                    if (claim.status === 'APPROVED' && claim.payout_amount > 0) {
                      await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}/payout/process`, {
                        claim_id: claim.id,
                        worker_id: claim.worker_id,
                        amount: claim.payout_amount,
                        status: 'PAID'
                      });
                    }
                  }
                }

                // === Step 3: Poll dashboard to show live update ===
                for (let i = 0; i < 5; i++) {
                  await new Promise(r => setTimeout(r, 1500));
                  await fetchDashboardData();
                }
              } catch (e: any) {
                console.error('Demo trigger failed:', e);
              } finally {
                setDemoLoading(false);
              }
            }}
            disabled={demoLoading}
            className="px-4 py-2 bg-amber-500 text-white rounded-full text-xs font-bold hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {demoLoading ? 'Triggering...' : 'Demo: Trigger Event'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {recentPayouts.length > 0 ? recentPayouts.map((p, i) => (
            <Card key={p.id || i} variant="grey" className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  {p.type === 'Weather' ? <CloudRain className="text-blue-500 w-6 h-6" /> : <Zap className="text-amber-500 w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-text-primary">{p.type} payout</h4>
                  <p className="text-xs font-medium text-text-secondary mt-0.5">{p.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-text-primary">₹{p.amount}</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                    p.status === 'PAID' ? "text-emerald-500" : p.status === 'PENDING' ? "text-amber-500" : "text-rose-500"
                  )}>{p.status}</p>
                </div>
              </div>
            </Card>
          )) : (
            <Card variant="grey" className="p-8 text-center col-span-full">
              <p className="text-text-secondary font-medium">No disruption events yet. Use the demo trigger above to simulate one!</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Transaction History</h1>
        <button className="px-6 py-2 bg-text-primary text-white pill-button text-xs shadow-lg shadow-slate-200">Export</button>
      </div>

      <Card variant="white" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Date</th>
                <th className="px-6 py-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Transaction Name</th>
                <th className="px-6 py-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Amount</th>
                <th className="px-6 py-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payouts.map((p) => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 text-xs font-medium text-text-secondary">{p.date}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-xl text-text-primary">
                          {p.type === 'Weather' ? <CloudRain className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-bold text-text-primary">{p.type} Payout</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-text-primary">₹{p.amount}</td>
                    <td className="px-6 py-5">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                  {p.breakdown && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-text-secondary font-medium mb-1">Hourly Revenue</p>
                            <p className="font-bold text-text-primary">₹{p.breakdown.hourly_rate} <span className="text-text-secondary text-[10px] font-normal">({p.breakdown.disruption_hours}h loss)</span></p>
                          </div>
                          <div>
                            <p className="text-text-secondary font-medium mb-1">Severity / Cap</p>
                            <p className="font-bold text-text-primary">{p.breakdown.severity_multiplier}x / ₹{p.breakdown.capped_at_coverage}</p>
                          </div>
                          <div>
                            <p className="text-text-secondary font-medium mb-1">ML Risk Penalty</p>
                            <p className="font-bold text-amber-600">{p.breakdown.fraud_penalty} reduction</p>
                          </div>
                          <div>
                            <p className="text-text-secondary font-medium mb-1">Final Payout</p>
                            <p className="font-bold text-emerald-600">₹{p.breakdown.final_payout}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderMyWeek = () => {
    const weekPaidCount = weekPayoutsArr.filter(p => p.status === 'PAID').length;
    const remainingPercent = coverageCap > 0 ? Math.round((weekRemainingCap / coverageCap) * 100) : 100;
    const dailyBreakdown = buildDailyBreakdown(payouts);
    const dailyPayoutChart = buildDailyPayoutChart(payouts);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekLabel = `${monday.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const weekNumber = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000);

    return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">My Week</h1>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-50">
          <span className="text-sm font-bold text-text-primary px-4">{weekLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="grey" className="p-5">
          <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-1">Disruptions</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-text-primary">{weekPayoutsArr.length}</h3>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">This week</span>
          </div>
        </Card>
        <Card variant="grey" className="p-5">
          <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-1">Paid out</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-text-primary">₹{weekPaidTotal}</h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{weekPaidCount} paid</span>
          </div>
        </Card>
        <Card variant="grey" className="p-5">
          <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-1">Remaining cap</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-text-primary">₹{weekRemainingCap}</h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{remainingPercent}% left</span>
          </div>
        </Card>
      </div>

      <Card variant="white" title="Daily breakdown" subtitle={`Week ${weekNumber}`}>
        <div className="mt-8 relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          {dailyBreakdown.map((day, i) => (
            <div key={i} className="relative pl-8">
              <div className={cn("absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm z-10", day.dotColor)}></div>
              <div className="space-y-3">
                <p className="text-sm font-bold text-text-secondary">{day.day}</p>
                {day.events.length === 0 ? (
                  <p className="text-sm font-medium text-text-secondary italic">No disruptions detected</p>
                ) : (
                  day.events.map((event: any, j: number) => (
                    <div key={j} className="bg-slate-50/80 p-4 rounded-2xl flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm", event.isWeather ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500')}>
                        {event.isWeather ? <CloudRain className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-text-primary">{event.type}</h4>
                        <p className="text-[10px] font-medium text-text-secondary">Triggered {event.time}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", event.status === 'Paid' ? 'text-emerald-600' : 'text-text-primary')}>
                          {event.status === 'Paid' ? '+' : ''}{event.amount}
                        </p>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                          event.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="white" title="Payout by day" subtitle="₹ received">
        <div className="h-48 mt-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyPayoutChart}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} />
              <Bar 
                dataKey="amount" 
                radius={[8, 8, 0, 0]} 
                barSize={60}
              >
                {dailyPayoutChart.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.status === 'paid' ? '#10B981' : entry.status === 'pending' ? '#F59E0B' : '#E5E7EB'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
    );
  };

  const renderRenew = () => (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setCurrentTab('home')}
          className="p-2 hover:bg-white rounded-full transition-colors text-text-secondary"
        >
          <ArrowUpRight className="w-5 h-5 rotate-180" />
        </button>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Renew Shield</h1>
      </div>

      {/* Main Premium Card */}
      <Card className="bg-emerald-600 text-white border-none shadow-xl shadow-emerald-100 overflow-hidden relative">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-2">Weekly Premium</p>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-5xl font-bold tracking-tighter">₹{premiumAmount}</span>
            <span className="text-emerald-100 text-lg">/week</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-emerald-200 text-[10px] font-bold uppercase mb-1">Coverage cap</p>
              <p className="text-lg font-bold">₹{coverageCap}</p>
            </div>
            <div>
              <p className="text-emerald-200 text-[10px] font-bold uppercase mb-1">Per disruption</p>
              <p className="text-lg font-bold">₹{perDisruption}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-200 text-[10px] font-bold uppercase mb-1">Valid till</p>
              <p className="text-lg font-bold">{renewalDate ? new Date(renewalDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* What's Included */}
      <Card title="WHAT'S INCLUDED" variant="grey">
        <div className="space-y-4 mt-2">
          {[
            { label: 'Rain/weather disruption payout', value: '₹160' },
            { label: 'Platform downtime payout', value: '₹160' },
            { label: 'Instant UPI transfer on trigger', value: 'Auto' },
            { label: 'Up to 5 claims per week', value: '—' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-text-primary">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-text-primary">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Auto-renew Toggle */}
      <Card variant="grey" className="flex items-center justify-between p-5">
        <div>
          <h4 className="text-sm font-bold text-text-primary">Auto-renew every Sunday</h4>
          <p className="text-xs text-text-secondary">We'll charge ₹49 automatically</p>
        </div>
        <div className="w-12 h-6 bg-emerald-500 rounded-full p-1 flex justify-end shadow-inner">
          <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
        </div>
      </Card>

      {/* Payment Section */}
      <Card variant="grey" title="PAY WITH UPI">
        <div className="grid grid-cols-3 gap-3 mt-4 mb-8">
          {[
            { name: 'GPay', icon: 'G', color: 'bg-blue-50 text-blue-600' },
            { name: 'PhonePe', icon: 'P', color: 'bg-purple-50 text-purple-600' },
            { name: 'Paytm', icon: 'P', color: 'bg-sky-50 text-sky-600' },
          ].map((app) => (
            <button key={app.name} className="flex flex-col items-center gap-2 group">
              <div className={cn("w-full aspect-square rounded-2xl flex items-center justify-center text-xl font-black shadow-sm group-hover:scale-105 transition-transform bg-white border border-slate-100")}>
                <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center", app.color)}>{app.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-text-secondary uppercase">{app.name}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary font-medium">Premium</span>
            <span className="text-text-primary font-bold">₹{premiumAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary font-medium">GST (18%)</span>
            <span className="text-text-primary font-bold">₹{gstAmount}</span>
          </div>
          <div className="flex justify-between text-lg pt-2 border-t border-slate-100">
            <span className="text-text-primary font-bold">Total</span>
            <span className="text-text-primary font-black">₹{totalWithGst}</span>
          </div>
        </div>

        <button 
          onClick={async () => {
            const wid = localStorage.getItem('@vritti_worker_id');
            if (wid) {
              await policyActivate(wid, 'UPI_RENEW_WEB');
              setPolicyStatus('ACTIVE');
              setCurrentTab('home');
            }
          }}
          className="w-full mt-8 py-4 bg-text-primary text-white pill-button shadow-xl shadow-slate-200 flex items-center justify-center gap-2">
          Activate Shield <ChevronRight className="w-5 h-5" />
        </button>
      </Card>
    </div>
  );

  const renderHelp = () => (
    <div className="space-y-8 pb-24">
      <div className="text-center max-w-md mx-auto py-8">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">How can we help?</h1>
        <p className="text-sm text-text-secondary font-medium">Search our knowledge base or contact support</p>
        <div className="mt-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-brand-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search for help..." 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border-none focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none text-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Shield, title: 'Fraud and Protection', desc: 'We are committed to ensuring the security and integrity of our platform.', color: 'bg-blue-50 text-blue-600' },
          { icon: AlertCircle, title: 'Privacy and Security', desc: 'Protecting your privacy and ensuring the security of your personal information.', color: 'bg-purple-50 text-purple-600' },
          { icon: Smartphone, title: 'Managing my account', desc: 'We are here to provide you with the information and assistance you need.', color: 'bg-pink-50 text-pink-600' },
        ].map((item, i) => (
          <Card key={i} className="text-center space-y-6 p-8 hover:scale-[1.02] transition-transform group">
            <div className={cn("w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm group-hover:shadow-md transition-all", item.color)}>
              <item.icon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-text-primary tracking-tight">{item.title}</h3>
            <p className="text-xs font-medium text-text-secondary leading-relaxed">{item.desc}</p>
          </Card>
        ))}
      </div>

      <Card variant="blue" className="p-8 text-center bg-brand-primary/5 border-none">
        <h3 className="text-xl font-bold text-text-primary mb-2">Need direct support?</h3>
        <p className="text-sm text-text-secondary mb-6 font-medium">Our team is available 24/7 to help you with any issues.</p>
        <button className="px-8 py-4 bg-brand-primary text-white pill-button shadow-lg shadow-brand-primary/20 inline-flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Chat with us
        </button>
      </Card>
    </div>
  );

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-primary/20">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-sm font-bold text-text-secondary">Loading Vritti...</p>
        </motion.div>
      </div>
    );
  }

  if (authView === 'login') return renderLogin();
  if (authView === 'signup') return renderSignup();
  if (authView === ('verify_otp' as any)) return renderVerifyOTP();
  if (authView === 'onboarding') return renderOnboarding();

  return (
    <div className="min-h-screen bg-bg-base font-sans selection:bg-brand-primary selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-100 flex-col p-8 z-20">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-12 h-12 bg-brand-primary rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tighter text-text-primary">Vritti</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[
            { id: 'home', icon: Home, label: 'Dashboard' },
            { id: 'myWeek', icon: Calendar, label: 'My Week' },
            { id: 'history', icon: History, label: 'History' },
            { id: 'renew', icon: RefreshCw, label: 'Renew Policy' },
            { id: 'help', icon: HelpCircle, label: 'Help' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl font-semibold text-sm transition-all duration-200",
                currentTab === item.id 
                  ? "bg-brand-primary/10 text-brand-primary shadow-sm" 
                  : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-6">
          <div className="p-6 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Current Period</p>
            <p className="text-sm font-bold text-text-primary">Week 14 · Apr 2026</p>
          </div>
          <button 
            onClick={() => {
              logout();
              setAuthView('login');
              setAuthPhone('');
              setAuthPassword('');
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl font-semibold text-sm text-text-secondary hover:bg-rose-50 hover:text-rose-600 transition-all">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-8 lg:p-12 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {currentTab === 'home' && renderHome()}
            {currentTab === 'myWeek' && renderMyWeek()}
            {currentTab === 'renew' && renderRenew()}
            {currentTab === 'history' && renderHistory()}
            {currentTab === 'help' && renderHelp()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-2xl border border-white/50 px-6 py-4 rounded-[2.5rem] flex justify-between items-center z-50 shadow-2xl shadow-slate-200">
        {[
          { id: 'home', icon: Home },
          { id: 'myWeek', icon: Calendar },
          { id: 'history', icon: History },
          { id: 'renew', icon: RefreshCw },
          { id: 'help', icon: HelpCircle },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id as any)}
            className={cn(
              "p-4 rounded-2xl transition-all duration-300",
              currentTab === item.id 
                ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/30 scale-110" 
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <item.icon className="w-6 h-6" />
          </button>
        ))}
      </nav>
    </div>
  );
}
