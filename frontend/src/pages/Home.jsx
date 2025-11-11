import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { useUser } from '../context/UserContext';
import { Users, ShoppingCart, IndianRupee, Megaphone, MessageSquare, TrendingUp, Calendar, Activity, MessageCircleReply, MessageCircleOff, ArrowUpRight } from 'lucide-react';

const Home = () => {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const fetchSummary = async () => {
      if (!accessToken || !user) return;

      try {
        const res = await axios.get(
          '/dashboard/summary',
          { businessId: user.businessId }, 
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setStats(res.data);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load dashboard summary"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [accessToken, user]);

  const cards = [
    { 
      title: 'Total Customers', 
      value: stats?.totalCustomers || 0, 
      icon: Users,
      color: '#3B82F6',
      bgColor: '#EFF6FF'
    },
    { 
      title: 'Total Orders', 
      value: stats?.totalOrders || 0, 
      icon: ShoppingCart,
      color: '#22C55E',
      bgColor: '#F0FDF4'
    },
    { 
      title: 'Total Revenue', 
      value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`, 
      icon: IndianRupee,
      color: '#6366F1',
      bgColor: '#EEF2FF'
    },
    { 
      title: 'Total Campaigns', 
      value: stats?.totalCampaigns || 0, 
      icon: Megaphone,
      color: '#F59E0B',
      bgColor: '#FFFBEB'
    },
    {
      title: 'Total Messages',
      value: (stats?.totalMessages || 0).toLocaleString(),
      icon: MessageSquare,
      color: '#14B8A6',
      bgColor: '#F0FDFA'
    },
    { 
      title: 'Messages Sent', 
      value: (stats?.messagesSent || 0).toLocaleString(), 
      icon: MessageCircleReply,
      color: '#8B5CF6',
      bgColor: '#F5F3FF'
    },
    { 
      title: 'Messages Failed', 
      value: (stats?.messagesFailed || 0).toLocaleString(), 
      icon: MessageCircleOff,
      color: '#EF4444',
      bgColor: '#FEF2F2'
    }
  ];

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-[#1E293B] mb-2">Dashboard</h1>
              <p className="text-[#64748B] text-lg">Welcome back! Here's your business overview.</p>
            </div>
            <div className="flex items-center space-x-3 px-4 py-2.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
              <Calendar className="w-5 h-5 text-[#3B82F6]" />
              <span className="text-sm font-medium text-[#64748B]">
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          {cards.map((card, idx) => {
            const IconComponent = card.icon;
            return (
              <div 
                key={idx} 
                className="group relative bg-white rounded-2xl border border-[#E2E8F0] p-6 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:border-[#CBD5E1]"
              >
                <div className="flex items-start justify-between mb-5">
                  <div 
                    className="p-3 rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <IconComponent 
                      className="w-6 h-6" 
                      style={{ color: card.color }}
                    />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: card.color }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                    {card.title}
                  </h3>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-[#F1F5F9] rounded-lg w-24"></div>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-[#1E293B]">
                      {typeof card.value === 'string' && card.value.includes('₹') 
                        ? card.value 
                        : formatNumber(card.value)}
                    </p>
                  )}
                </div>

                {/* Hover effect border */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ 
                    boxShadow: `0 0 0 2px ${card.color}15`
                  }}
                ></div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions Section */}
        {(user?.role === "admin" || user?.role === "manager") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
              <div className="flex items-center mb-6">
                <div className="w-1 h-7 bg-gradient-to-b from-[#3B82F6] to-[#6366F1] rounded-full mr-3"></div>
                <h3 className="text-2xl font-bold text-[#1E293B]">Quick Actions</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a 
                  href="/customers"
                  className="group relative p-5 rounded-xl bg-[#F7F9FC] hover:bg-white border border-[#E2E8F0] hover:border-[#3B82F6] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] group-hover:border-[#3B82F6] transition-colors">
                      <Users className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#64748B] group-hover:text-[#3B82F6] transition-colors" />
                  </div>
                  <span className="font-semibold text-[#1E293B] group-hover:text-[#3B82F6] transition-colors">
                    Manage Customers
                  </span>
                </a>
                
                <a 
                  href="/campaigns"
                  className="group relative p-5 rounded-xl bg-[#F7F9FC] hover:bg-white border border-[#E2E8F0] hover:border-[#22C55E] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(34,197,94,0.15)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] group-hover:border-[#22C55E] transition-colors">
                      <Megaphone className="w-5 h-5 text-[#22C55E]" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#64748B] group-hover:text-[#22C55E] transition-colors" />
                  </div>
                  <span className="font-semibold text-[#1E293B] group-hover:text-[#22C55E] transition-colors">
                    Create Campaign
                  </span>
                </a>
                
                <a 
                  href="/orders"
                  className="group relative p-5 rounded-xl bg-[#F7F9FC] hover:bg-white border border-[#E2E8F0] hover:border-[#6366F1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] group-hover:border-[#6366F1] transition-colors">
                      <ShoppingCart className="w-5 h-5 text-[#6366F1]" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#64748B] group-hover:text-[#6366F1] transition-colors" />
                  </div>
                  <span className="font-semibold text-[#1E293B] group-hover:text-[#6366F1] transition-colors">
                    View Orders
                  </span>
                </a>

                <a
                  href='/team'
                  className="group relative p-5 rounded-xl bg-[#F7F9FC] hover:bg-white border border-[#E2E8F0] hover:border-[#F59E0B] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] group-hover:border-[#F59E0B] transition-colors">
                      <Activity className="w-5 h-5 text-[#F59E0B]" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#64748B] group-hover:text-[#F59E0B] transition-colors" />
                  </div>
                  <span className="font-semibold text-[#1E293B] group-hover:text-[#F59E0B] transition-colors">
                    Manage Team
                  </span>
                </a>
              </div>
            </div>

            {/* Business Insights Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] rounded-2xl p-8 text-white shadow-[0_0_24px_rgba(59,130,246,0.3)]">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-bold mb-4">Business Insights</h3>
                  <p className="text-blue-50 text-lg mb-8 leading-relaxed max-w-md">
                    Unlock powerful analytics and comprehensive insights to drive your business growth with data-driven decisions.
                  </p>
                </div>
                
                <a 
                  href="/reports"
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-[#3B82F6] rounded-xl font-semibold transition-all duration-300 hover:bg-blue-50 hover:shadow-lg group w-fit"
                >
                  <span>View Detailed Reports</span>
                  <TrendingUp className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;