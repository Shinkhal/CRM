import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { Users, ShoppingCart, IndianRupee, Megaphone, MessageSquare, TrendingUp, Calendar, Activity, MessageCircleReply, MessageCircleOff } from 'lucide-react';

const Home = () => {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/dashboard/summary', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch summary:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) fetchSummary();
  }, [accessToken]);

  const cards = [
    { 
      title: 'Total Customers', 
      value: stats?.totalCustomers || 0, 
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      lightGradient: 'from-blue-50 to-blue-100'
    },
    { 
      title: 'Total Orders', 
      value: stats?.totalOrders || 0, 
      icon: ShoppingCart,
      gradient: 'from-emerald-500 to-emerald-600',
      lightGradient: 'from-emerald-50 to-emerald-100'
    },
    { 
      title: 'Total Revenue', 
      value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`, 
      icon: IndianRupee,
      gradient: 'from-purple-500 to-purple-600',
      lightGradient: 'from-purple-50 to-purple-100'
    },
    { 
      title: 'Total Campaigns', 
      value: stats?.totalCampaigns || 0, 
      icon: Megaphone,
      gradient: 'from-orange-500 to-orange-600',
      lightGradient: 'from-orange-50 to-orange-100'
    },
    {
        title: 'Total Messages',
        value: (stats?.totalMessages || 0).toLocaleString(),
        icon: MessageSquare,
        gradient: 'from-teal-500 to-teal-600',
        lightGradient: 'from-teal-50 to-teal-100'
    },
    { 
      title: 'Messages Sent', 
      value: (stats?.messagesSent || 0).toLocaleString(), 
      icon: MessageCircleReply,
      gradient: 'from-indigo-500 to-indigo-600',
      lightGradient: 'from-indigo-50 to-indigo-100'
    },
    { 
      title: 'Messages Failed', 
      value: (stats?.messagesFailed || 0).toLocaleString(), 
      icon: MessageCircleOff,
      gradient: 'from-red-500 to-red-600',
      lightGradient: 'from-red-50 to-red-100'
    }
  ];

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
              <p className="text-gray-600">Welcome back! Here's what's happening with your business today.</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {cards.map((card, idx) => {
            const IconComponent = card.icon;
            return (
              <div key={idx} className="relative group">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl hover:bg-white/80 transition-all duration-300 hover:border-white/40">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-4 rounded-xl bg-gradient-to-r ${card.lightGradient} shadow-sm`}>
                      <IconComponent className="w-6 h-6 text-gray-700" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${card.gradient} animate-pulse`}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider leading-tight">
                      {card.title}
                    </h3>
                    {loading ? (
                      <div className="animate-pulse">
                        <div className="h-9 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent">
                        {typeof card.value === 'string' && card.value.includes('₹') 
                          ? card.value 
                          : formatNumber(card.value)}
                      </p>
                    )}
                  </div>

                  {/* Subtle animated gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-all duration-300`}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-3"></div>
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a 
                  href="/customers"
                  className="group p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-300 flex items-center space-x-3 border border-blue-200 hover:border-blue-300 hover:shadow-md"
                >
                  <div className="p-2 rounded-lg bg-white shadow-sm group-hover:shadow-md transition-shadow">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-blue-800">Manage Customers</span>
                </a>
                
                <a 
                  href="/campaigns"
                  className="group p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200 transition-all duration-300 flex items-center space-x-3 border border-green-200 hover:border-green-300 hover:shadow-md"
                >
                  <div className="p-2 rounded-lg bg-white shadow-sm group-hover:shadow-md transition-shadow">
                    <Megaphone className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium text-green-800">Create Campaign</span>
                </a>
                
                <a 
                  href="/orders"
                  className="group p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all duration-300 flex items-center space-x-3 border border-purple-200 hover:border-purple-300 hover:shadow-md"
                >
                  <div className="p-2 rounded-lg bg-white shadow-sm group-hover:shadow-md transition-shadow">
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-purple-800">View Orders</span>
                </a>
                
                <a 
                  href="/campaign-history"
                  className="group p-4 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-all duration-300 flex items-center space-x-3 border border-orange-200 hover:border-orange-300 hover:shadow-md"
                >
                  <div className="p-2 rounded-lg bg-white shadow-sm group-hover:shadow-md transition-shadow">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="font-medium text-orange-800">View Messages</span>
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3">Business Insights</h3>
                <p className="text-indigo-100 mb-6 leading-relaxed">
                  Get detailed analytics and insights about your business performance with our advanced reporting tools.
                </p>
                <a 
                  href="/reports"
                  className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:shadow-lg"
                >
                  View Detailed Reports
                  <TrendingUp className="w-5 h-5 ml-2" />
                </a>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5 rounded-full"></div>
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;