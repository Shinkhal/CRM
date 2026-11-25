import { useState, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/authContext.js';
import { toast } from 'react-toastify';
import {
  Building2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Zap,
} from 'lucide-react';

const INDUSTRIES = [
  'Technology',
  'Finance & Banking',
  'Healthcare',
  'Retail & E-commerce',
  'Manufacturing',
  'Consulting',
  'Real Estate',
  'Education',
  'General',
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

const AuthPage = ({ initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';

  // Login Form State
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Register Form State
  const [registerData, setRegisterData] = useState({
    adminName: '',
    email: '',
    password: '',
    companyName: '',
    industry: 'Technology',
    currency: 'INR',
  });

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    const pwd = activeTab === 'login' ? loginData.password : registerData.password;
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: '', color: 'bg-slate-200' };
    }
  }, [activeTab, loginData.password, registerData.password]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(loginData.email, loginData.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (registerData.password.length < 8) {
      return setError('Password must be at least 8 characters long');
    }

    setLoading(true);
    try {
      await register(registerData);
      toast.success('Workspace created successfully! 🚀');
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Failed to create workspace. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/google`;
  };

  const handleDemoSignIn = async (role) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(role);
      toast.success(`Logged in as Demo ${role.toUpperCase()} ⚡`);
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Demo login error:', err);
      setError(err.response?.data?.message || 'Failed to launch demo account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Subtle physical millimeter grid pattern background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `radial-gradient(#CBD2DF 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2E6EE] shadow-xs flex items-center justify-center text-[#181E29] group-hover:scale-105 transition-transform"
               style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.06), inset 0 1px 0 #FFF' }}>
            <Building2 className="w-7 h-7 text-[#181E29]" />
          </div>
          <span className="font-heading text-2xl font-black text-[#111827] tracking-tight">
            Nexus
          </span>
        </Link>
        <p className="mt-2 text-xs font-medium text-[#6B7280]">
          Workspace Access
        </p>
      </div>

      {/* Auth Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="skeuo-plate p-6 sm:p-8 bg-white border border-[#E2E6EE]">
          {/* Tab Switcher */}
          <div className="flex skeuo-well p-1 border border-[#CBD2DF] mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-[#111827] shadow-xs font-bold border border-[#CBD2DF]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-[#111827] shadow-xs font-bold border border-[#CBD2DF]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Register Company
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* SIGN IN TAB */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1.5 font-mono">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 skeuo-well bg-[#EEF1F6] border border-[#CBD2DF] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#181E29]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1.5 font-mono">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 skeuo-well bg-[#EEF1F6] border border-[#CBD2DF] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#181E29]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#9CA3AF] hover:text-[#4B5563] absolute right-3.5 top-3"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="skeuo-button-dark w-full mt-2 py-3 px-4 text-sm font-bold gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTER COMPANY TAB */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1 font-mono">
                    Your Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={registerData.adminName}
                      onChange={(e) => setRegisterData({ ...registerData, adminName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 skeuo-well bg-[#EEF1F6] border border-[#CBD2DF] rounded-xl text-xs text-[#111827] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#181E29]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1 font-mono">
                    Work Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="jane@company.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 skeuo-well bg-[#EEF1F6] border border-[#CBD2DF] rounded-xl text-xs text-[#111827] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#181E29]/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1 font-mono">
                  Password (min 8 chars) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2 skeuo-well bg-[#EEF1F6] border border-[#CBD2DF] rounded-xl text-xs text-[#111827] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#181E29]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#9CA3AF] hover:text-[#4B5563] absolute right-3.5 top-2.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength meter */}
                {registerData.password && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-[#EEF1F6] border border-[#E2E6EE] rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 transition-all ${
                            step <= passwordStrength.score ? passwordStrength.color : 'bg-[#E2E6EE]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-[#6B7280] font-semibold">
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#E2E6EE]">
                <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1 font-mono">
                  Company / Organization Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={registerData.companyName}
                    onChange={(e) => setRegisterData({ ...registerData, companyName: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 skeuo-well bg-[#EEF1F6] border border-[#CBD2DF] rounded-xl text-xs text-[#111827] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#181E29]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1 font-mono">
                    Industry
                  </label>
                  <select
                    value={registerData.industry}
                    onChange={(e) => setRegisterData({ ...registerData, industry: e.target.value })}
                    className="w-full px-3 py-2 skeuo-well bg-[#EEF1F6] border border-[#CBD2DF] rounded-xl text-xs text-[#111827] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#181E29]/20"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1 font-mono">
                    Currency
                  </label>
                  <select
                    value={registerData.currency}
                    onChange={(e) => setRegisterData({ ...registerData, currency: e.target.value })}
                    className="w-full px-3 py-2 skeuo-well bg-[#EEF1F6] border border-[#CBD2DF] rounded-xl text-xs text-[#111827] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#181E29]/20"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="skeuo-button-dark w-full mt-3 py-3 px-4 text-sm font-bold gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Creating Workspace...' : 'Launch CRM Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Social Google Divider */}
          <div className="my-5 flex items-center">
            <div className="flex-1 border-t border-[#E2E6EE]"></div>
            <span className="px-3 text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider font-mono">
              Or continue with
            </span>
            <div className="flex-1 border-t border-[#E2E6EE]"></div>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="skeuo-button w-full py-2.5 px-4 text-xs font-semibold gap-2.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Google Account</span>
          </button>

          {/* Quick Demo Sandbox Access */}
          <div className="mt-6 pt-5 border-t border-[#E2E6EE]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2.5 font-mono">
              <Zap className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Instant Demo Sandbox Access</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSignIn('admin')}
                className="skeuo-button py-1.5 px-2 text-[11px] font-bold text-[#111827]"
              >
                ⚡ Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('manager')}
                className="skeuo-button py-1.5 px-2 text-[11px] font-bold text-[#111827]"
              >
                ⚡ Manager
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('viewer')}
                className="skeuo-button py-1.5 px-2 text-[11px] font-bold text-[#6B7280]"
              >
                ⚡ Viewer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
