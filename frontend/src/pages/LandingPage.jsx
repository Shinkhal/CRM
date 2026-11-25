import { useState } from 'react';
import { Link } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import {
  TrendingUp,
  Building2,
  Sparkles,
  ArrowRight,
  Zap,
  Megaphone,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Users,
  CheckSquare,
  Lock,
  Globe,
  Sliders,
  DollarSign,
  BarChart2,
} from 'lucide-react';

const Landing = () => {
  const uri = import.meta.env.VITE_BACKEND_URL;
  const [activeTab, setActiveTab] = useState('pipeline');

  const handleGoogleLogin = () => {
    window.location.href = `${uri}/auth/google`;
  };

  const sampleDeals = [
    { name: 'Apex Corp Enterprise License', amount: '₹8,50,000', stage: 'Proposal', contact: 'Rahul Verma', company: 'Apex Global' },
    { name: 'CloudScale Cloud Migration', amount: '₹14,20,000', stage: 'Negotiation', contact: 'Priya Sharma', company: 'CloudScale Inc' },
    { name: 'OmniFlow Annual Subscription', amount: '₹4,80,000', stage: 'Won', contact: 'Amit Patel', company: 'OmniFlow Labs' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Modern Navbar */}
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-blue-100/60 via-indigo-100/40 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-xs mb-8 hover:border-slate-300 transition-colors">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Nexus Platform</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-slate-600">The Modern Operating System for Sales</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.12]">
            Close more deals with{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
              complete visibility
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            Manage visual Kanban pipelines, orchestrate B2B corporate relationships, automate multi-channel campaigns, and uncover revenue opportunities with AI intelligence.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-10">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login?demo=true"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm shadow-xs hover:border-slate-300 transition-all"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Launch Live Demo</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 font-medium">
            <button
              onClick={handleGoogleLogin}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google Single Sign-On</span>
            </button>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>SOC-2 Ready Security</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>99.99% Uptime Guarantee</span>
            </div>
          </div>

          {/* Interactive Modern App Preview */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-5 shadow-xl text-left">
            {/* Header bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 px-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-semibold text-slate-700">Nexus Pipeline Console</span>
              </div>

              {/* View Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setActiveTab('pipeline')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'pipeline' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Sales Pipeline
                </button>
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Customer 360
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'ai' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  AI Forecast
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="p-4 sm:p-6 bg-slate-50/60 rounded-xl mt-3">
              {activeTab === 'pipeline' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sampleDeals.map((deal, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold uppercase text-[10px]">{deal.stage}</span>
                        <span className="text-slate-500">{deal.company}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">{deal.name}</h4>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="font-extrabold text-base text-slate-900">{deal.amount}</span>
                        <span className="text-xs text-slate-500">{deal.contact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'customers' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">RV</div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">Rahul Verma</div>
                        <div className="text-xs text-slate-500">Chief Technology Officer • Apex Global</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">High Intent</span>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">PS</div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">Priya Sharma</div>
                        <div className="text-xs text-slate-500">VP of Operations • CloudScale Inc</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">Active Deal</span>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="font-bold text-sm text-white">Gemini Growth Recommendation</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4">
                    High win probability detected for 2 deals in negotiation. Reach out to Rahul Verma (Apex Global) with standard onboarding terms to accelerate closing within 5 days.
                  </p>
                  <div className="flex items-center gap-4 text-xs font-medium text-purple-300">
                    <span>Forecast Confidence: 94%</span>
                    <span>•</span>
                    <span>Est. Upsell Value: ₹8.5L</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Comprehensive Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
              Everything your revenue team needs to succeed
            </h2>
            <p className="text-base text-slate-600 mt-3">
              A unified operating suite designed to replace disjointed spreadsheets and clunky legacy systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Visual Kanban Pipeline</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Drag-and-drop deals across customized stages. Track win probabilities, bottleneck stages, and deal values at a glance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Customer 360 & Accounts</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Unified lead directory, contact stakeholder lists, purchase histories, and notes accessible across your whole team.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Gemini AI Growth Signals</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Automated customer churn warnings, recommended sales touchpoints, and revenue pipeline projections powered by AI.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Megaphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Omnichannel Campaigns</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Filter customer segments by order volume or stage, dispatch targeted outreach, and review real-time delivery logs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Tasks & Activities</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Assign client follow-up calls, upcoming contract deadlines, and action checklists to team members with priority badges.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Enterprise Access & Security</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Role-based privileges (Admin, Manager, Member), audit trails, and isolated workspaces ensuring complete data protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Security Section */}
      <section id="security" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Enterprise Data Governance</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Built for corporate reliability, compliance, and speed
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
                Every organization's records are isolated and protected by modern encryption standards, automated token rotation, and robust role-based access control.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-sm text-slate-900">Workspace Privacy</div>
                  <div className="text-xs text-slate-500 mt-1">Strict tenant boundaries ensure your client records remain exclusive to your team.</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-sm text-slate-900">Role-Based Security</div>
                  <div className="text-xs text-slate-500 mt-1">Control access to financial reports, customer exports, and system settings.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ready to streamline your customer growth?
          </h2>
          <p className="text-base text-slate-600 mt-3 max-w-xl mx-auto">
            Get started in under 60 seconds. Launch an instant live demo or create your company workspace today.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md transition-colors"
            >
              <span>Create Company Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login?demo=true"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>1-Click Sandbox Demo</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-sm">Nexus</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-slate-700">All Systems Operational</span>
            </span>
            <span>© {new Date().getFullYear()} Nexus</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;