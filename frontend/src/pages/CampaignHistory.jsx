import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { BarChart3, TrendingUp, Users, MessageSquare, Calendar, Eye, RefreshCw, Plus, Filter, Search, Zap, Target, Activity } from 'lucide-react';

const CampaignHistory = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [statistics, setStatistics] = useState({
    totalCampaigns: 0,
    totalMessages: 0,
    successRate: 0,
    totalAudience: 0
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/campaigns/stats');
      setCampaigns(res.data);
      const stats = res.data.reduce((acc, campaign) => {
        acc.totalCampaigns++;
        acc.totalMessages += (campaign.sent + campaign.failed) || 0;
        acc.totalAudience += campaign.audienceSize || 0;
        return acc;
      }, { totalCampaigns: 0, totalMessages: 0, totalAudience: 0 });
      if (stats.totalMessages > 0) {
        const totalSent = res.data.reduce((sum, campaign) => sum + (campaign.sent || 0), 0);
        stats.successRate = Math.round((totalSent / stats.totalMessages) * 100);
      }
      setStatistics(stats);
    } catch (err) {
      toast.error('Failed to fetch campaigns. Please try again.');
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const getStatusColor = (successRate) => {
    if (successRate >= 90) return 'from-emerald-500 to-green-600';
    if (successRate >= 70) return 'from-blue-500 to-indigo-600';
    if (successRate >= 50) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getStatusRing = (successRate) => {
    if (successRate >= 90) return 'ring-emerald-500/20';
    if (successRate >= 70) return 'ring-blue-500/20';
    if (successRate >= 50) return 'ring-amber-500/20';
    return 'ring-red-500/20';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'high') return matchesSearch && (campaign.successRate || 0) >= 90;
    if (filterBy === 'medium') return matchesSearch && (campaign.successRate || 0) >= 70 && (campaign.successRate || 0) < 90;
    if (filterBy === 'low') return matchesSearch && (campaign.successRate || 0) < 70;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                  
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
            >
              <option value="all">All Campaigns</option>
              <option value="high">High Performance (90%+)</option>
              <option value="medium">Medium Performance (70-89%)</option>
              <option value="low">Needs Attention (&lt;70%)</option>
            </select>
          </div>
        </div>

       <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
  {[
    {
      label: 'Total Campaigns',
      value: statistics.totalCampaigns,
      icon: <BarChart3 className="h-5 w-5 text-violet-600" />,
    },
    {
      label: 'Messages Sent',
      value: statistics.totalMessages.toLocaleString(),
      icon: <MessageSquare className="h-5 w-5 text-blue-600" />,
    },
    {
      label: 'Success Rate',
      value: `${statistics.successRate}%`,
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
    },
    {
      label: 'Total Reach',
      value: statistics.totalAudience.toLocaleString(),
      icon: <Users className="h-5 w-5 text-orange-600" />,
    },
  ].map((stat, idx) => (
    <div
      key={idx}
      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
    >
      <div>
        <div className="text-sm text-gray-500">{stat.label}</div>
        <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
      </div>
      <div className="ml-3">{stat.icon}</div>
    </div>
  ))}
</div>
        {loading ? (
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 flex justify-center items-center p-16">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 flex flex-col items-center justify-center p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6">
              <Activity className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-800 mb-2">No campaigns found</h3>
            <p className="text-slate-500 mb-6 max-w-md">
              {searchTerm || filterBy !== 'all' 
                ? "Try adjusting your search or filter criteria" 
                : "Create your first campaign to start engaging with your audience"
              }
            </p>
            {!searchTerm && filterBy === 'all' && (
              <Link
                to="/campaigns"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Create Your First Campaign
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign._id} className="group relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${getStatusColor(campaign.successRate || 0)} rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-300`}></div>
                <div className={`relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden ring-1 ${getStatusRing(campaign.successRate || 0)}`}>
                  
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100/50">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-slate-800 truncate flex-1 mr-3" title={campaign.name}>
                        {campaign.name}
                      </h3>
                      <div className="flex items-center gap-1 px-3 py-1 bg-slate-100/80 rounded-full">
                        <Users className="h-3 w-3 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">{campaign.audienceSize?.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(campaign.createdAt)} at {formatTime(campaign.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* Performance Ring */}
                  <div className="px-6 py-4 bg-slate-50/50">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-24 h-24">
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-slate-200"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - (campaign.successRate || 0) / 100)}`}
                            className="transition-all duration-1000 ease-out"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" className={`${(campaign.successRate || 0) >= 90 ? 'text-emerald-500' : (campaign.successRate || 0) >= 70 ? 'text-blue-500' : (campaign.successRate || 0) >= 50 ? 'text-amber-500' : 'text-red-500'}`} stopColor="currentColor" />
                              <stop offset="100%" className={`${(campaign.successRate || 0) >= 90 ? 'text-green-600' : (campaign.successRate || 0) >= 70 ? 'text-indigo-600' : (campaign.successRate || 0) >= 50 ? 'text-orange-600' : 'text-rose-600'}`} stopColor="currentColor" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-800">{campaign.successRate || 0}%</div>
                            <div className="text-xs text-slate-500 font-medium">Success</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 pt-2">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-3 bg-emerald-50/80 rounded-xl">
                        <div className="text-2xl font-bold text-emerald-700">{(campaign.sent || 0).toLocaleString()}</div>
                        <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Delivered</div>
                      </div>
                      <div className="text-center p-3 bg-red-50/80 rounded-xl">
                        <div className="text-2xl font-bold text-red-700">{(campaign.failed || 0).toLocaleString()}</div>
                        <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Failed</div>
                      </div>
                    </div>
                    
                    <Link
                      to={`/campaign/${campaign._id}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-200 group"
                    >
                      <Eye className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                      View Analytics
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignHistory;