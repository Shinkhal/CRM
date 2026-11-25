import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/authContext.js';
import { toast } from 'react-toastify';
import { useUser } from '../context/userContext.js';
import {
  Users,
  ShoppingCart,
  IndianRupee,
  Megaphone,
  TrendingUp,
  Calendar,
  Building2,
  CheckSquare,
  Sparkles,
  Shield,
  Store,
  ArrowRight,
  Plus,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  StatCard,
  Avatar,
} from '../components/ui';

const Home = () => {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isModuleEnabled } = useUser();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hr = currentTime.getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const hours = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }).split(' ')[0];
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');
  const ampm = currentTime.toLocaleTimeString('en-US', { hour12: true }).slice(-2);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  useEffect(() => {
    const fetchSummary = async () => {
      if (!accessToken || !user) return;

      try {
        const res = await axios.get('/dashboard/summary');
        setStats(res.data);
      } catch (err) {
        toast.error(
          err.response?.data?.message || 'Failed to load dashboard summary'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [accessToken, user]);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const deliveryRate = stats?.totalMessages > 0
    ? Math.round(((stats?.messagesSent || 0) / stats.totalMessages) * 100)
    : 100;

  const kpis = [
    {
      title: 'Total Revenue',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,
      sub: 'Cumulative closed sales',
      icon: IndianRupee,
      color: 'text-blue-600',
      bgLight: 'bg-blue-50',
      borderLight: 'border-blue-100',
      link: '/orders',
    },
    {
      title: 'Active Customers',
      value: formatNumber(stats?.totalCustomers || 0),
      sub: 'Accounts & qualified contacts',
      icon: Users,
      color: 'text-indigo-600',
      bgLight: 'bg-indigo-50',
      borderLight: 'border-indigo-100',
      link: '/customers',
    },
    {
      title: 'Total Orders',
      value: formatNumber(stats?.totalOrders || 0),
      sub: 'Processed deals & purchases',
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-100',
      link: '/orders',
    },
    {
      title: 'Campaign Outreach',
      value: `${deliveryRate}%`,
      sub: `${stats?.messagesSent || 0} delivered messages`,
      icon: Megaphone,
      color: 'text-amber-600',
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-100',
      link: '/campaign-history',
    },
  ];

  const enterpriseHubs = [
    {
      title: 'Sales Pipeline',
      desc: 'Visual Kanban board, deal stages, and win/loss conversion tracking.',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50 group-hover:bg-blue-600 group-hover:text-white',
      badge: 'Revenue',
      link: '/pipeline',
      enabled: isModuleEnabled('sales_pipeline'),
    },
    {
      title: 'Customer Directory',
      desc: 'Complete 360° customer profiles, history, and lead qualification.',
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white',
      badge: 'Core',
      link: '/customers',
      enabled: true,
    },
    {
      title: 'Accounts & Organizations',
      desc: 'Corporate hierarchy, multi-contact stakeholders, and deal records.',
      icon: Building2,
      color: 'text-violet-600',
      bg: 'bg-violet-50 group-hover:bg-violet-600 group-hover:text-white',
      badge: 'B2B',
      link: '/organizations',
      enabled: isModuleEnabled('organizations'),
    },
    {
      title: 'Tasks & Follow-ups',
      desc: 'Upcoming calls, scheduled demos, priority deadlines, and checklists.',
      icon: CheckSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50 group-hover:bg-amber-600 group-hover:text-white',
      badge: 'Operations',
      link: '/tasks',
      enabled: isModuleEnabled('tasks'),
    },
    {
      title: 'Audience Campaigns',
      desc: 'Targeted customer segment filters, email dispatches, and logs.',
      icon: Megaphone,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white',
      badge: 'Marketing',
      link: '/campaigns',
      enabled: isModuleEnabled('campaigns'),
    },
    {
      title: 'Orders & Commerce',
      desc: 'Customer purchase history, fulfillment statuses, and order totals.',
      icon: ShoppingCart,
      color: 'text-teal-600',
      bg: 'bg-teal-50 group-hover:bg-teal-600 group-hover:text-white',
      badge: 'Commerce',
      link: '/orders',
      enabled: isModuleEnabled('orders'),
    },
    {
      title: 'AI Growth Insights',
      desc: 'Gemini-powered deal velocity forecasts and customer churn signals.',
      icon: Sparkles,
      color: 'text-purple-600',
      bg: 'bg-purple-50 group-hover:bg-purple-600 group-hover:text-white',
      badge: 'AI Engine',
      link: '/reports',
      enabled: user?.role === 'admin' && isModuleEnabled('ai_insights'),
    },
    {
      title: 'Team & Permissions',
      desc: 'Workspace members, role-based access control, and team activity.',
      icon: Shield,
      color: 'text-slate-700',
      bg: 'bg-slate-100 group-hover:bg-slate-800 group-hover:text-white',
      badge: 'Admin',
      link: '/team',
      enabled: true,
    },
    {
      title: 'App Marketplace',
      desc: 'Turn CRM tools and feature modules on or off for your organization.',
      icon: Store,
      color: 'text-rose-600',
      bg: 'bg-rose-50 group-hover:bg-rose-600 group-hover:text-white',
      badge: 'Settings',
      link: '/store',
      enabled: user?.role === 'admin',
    },
  ].filter((h) => h.enabled);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Modern Welcome Header */}
      <Card className="p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <Badge variant="success" dot={true}>
                Workspace Active
              </Badge>
              <span className="text-xs text-slate-300">•</span>
              <Badge variant="outline">
                Role: {user?.role ? user.role.toUpperCase() : 'MEMBER'}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name={user?.name || user?.email} size="lg" status="online" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {getGreeting()}, {user?.name || user?.email?.split('@')[0] || 'User'} 👋
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Real-time pipeline metrics, high-value deals, and customer accounts.
                </p>
              </div>
            </div>
          </div>

          {/* Clock & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl sm:text-2xl font-bold text-slate-900">
                    {hours}:{minutes}
                  </span>
                  <span className="text-xs font-semibold text-blue-600">
                    :{seconds}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase ml-0.5">
                    {ampm}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/pipeline">
                <Button variant="primary" size="md">
                  <TrendingUp className="w-4 h-4" />
                  <span>Sales Pipeline</span>
                </Button>
              </Link>
              <Link to="/customers">
                <Button variant="outline" size="md">
                  <Plus className="w-4 h-4" />
                  <span>Add Customer</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Operational Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[11px] font-medium text-slate-500">System Availability</div>
            <div className="text-xs font-bold text-slate-800 truncate">
              99.9% Uptime Active
            </div>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[11px] font-medium text-slate-500">Data Security</div>
            <div className="text-xs font-bold text-slate-800 truncate">
              Encrypted & Protected
            </div>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[11px] font-medium text-slate-500">AI Engine</div>
            <div className="text-xs font-bold text-slate-800 truncate">
              Gemini Signals Ready
            </div>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[11px] font-medium text-slate-500">Access Level</div>
            <div className="text-xs font-bold text-slate-800 truncate capitalize">
              {user?.role || 'Standard'} Privileges
            </div>
          </div>
        </Card>
      </div>

      {/* Financial & Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            sub={kpi.sub}
            icon={kpi.icon}
            color={kpi.color}
            bgLight={kpi.bgLight}
            borderLight={kpi.borderLight}
            link={kpi.link}
            loading={loading}
          />
        ))}
      </div>

      {/* Applications Launchpad */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Workspace Applications</h2>
            <p className="text-xs text-slate-500">Direct access to your core business tools</p>
          </div>
          <Badge variant="default">
            {enterpriseHubs.length} Enabled Modules
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {enterpriseHubs.map((hub, index) => {
            const Icon = hub.icon;
            return (
              <Link
                key={index}
                to={hub.link}
                className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${hub.bg} ${hub.color} flex items-center justify-center transition-colors shadow-xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {hub.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {hub.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {hub.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 opacity-90 group-hover:opacity-100">
                  <span>Open Tool</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI Intelligence Spotlight & Workspace Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gemini AI Summary Card */}
        <div className="lg:col-span-2 p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Gemini AI Executive Intelligence</h3>
                <p className="text-xs text-slate-300">Continuous business analytics & pipeline recommendations</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 my-4 text-xs sm:text-sm text-slate-200 leading-relaxed">
              💡 <strong>Growth Strategy Tip:</strong> Segment high-spending customers using automated campaigns and nurture open pipeline deals in proposal stage to accelerate sales cycle velocity.
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-2">
            <span className="text-xs text-slate-400">
              Continuously analyzed across your customer and order data
            </span>
            <Link
              to="/reports"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-100 shadow-xs transition-all"
            >
              <span>Explore AI Insights</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Workspace & Team Governance Card */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-sm font-bold text-slate-900">Workspace & Team</CardTitle>
              <Badge variant="success" dot={true}>
                Active
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Your Organization</span>
                <span className="font-semibold text-slate-800">Primary Workspace</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Your Role</span>
                <span className="font-semibold text-blue-600 capitalize">{user?.role || 'Member'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Team Collaboration</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Ready
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Data Protection</span>
                <span className="font-medium text-slate-700">Encrypted Cloud Storage</span>
              </div>
            </div>
          </div>

          <Link to="/team" className="mt-4 block">
            <Button variant="outline" size="sm" className="w-full">
              Manage Team & Invitations
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default Home;