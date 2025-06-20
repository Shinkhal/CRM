import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import {  Lightbulb, Loader, Database, Calendar, Users, ShoppingCart, MessageSquare, TrendingUp } from 'lucide-react';

const Reports = () => {
  const { accessToken } = useAuth();
  const [insights, setInsights] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get('/dashboard/insights', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      setInsights(res.data.insights || []);
      setMetadata(res.data.metadata || null);
      
      if (res.data.insights?.length > 0) {
        toast.success('Business insights updated successfully!');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load business insights.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Insights fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchInsights();
  }, [accessToken,]);

  const getDataIcon = (type) => {
    const icons = {
      customers: Users,
      orders: ShoppingCart,
      campaigns: TrendingUp,
      logs: MessageSquare
    };
    return icons[type] || Database;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Insights & Growth Tips</h1>
            <p className="text-gray-600 mt-1">AI-generated suggestions to help your business grow.</p>
            
          </div>
          
        </div>

        {/* Insights Analytics Bar */}
        {metadata?.dataPoints && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Analysis Coverage</h3>
              <span className="text-sm text-gray-500">Data points analyzed</span>
            </div>
            
            <div className="space-y-3">
              {Object.entries(metadata.dataPoints).map(([key, value]) => {
                const Icon = getDataIcon(key);
                const maxValue = Math.max(...Object.values(metadata.dataPoints));
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                
                return (
                  <div key={key} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-20">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600 capitalize">{key}</span>
                    </div>
                    
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    
                    <span className="text-sm font-semibold text-gray-700 w-8 text-right">{value}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Total data points: {Object.values(metadata.dataPoints).reduce((a, b) => a + b, 0)}
                </span>
                <span className="text-indigo-600 font-medium">
                  AI Confidence: High
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Insights Section */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="animate-spin w-8 h-8 text-indigo-600 mb-4" />
              <p className="text-gray-500">Analyzing your business data...</p>
              <p className="text-sm text-gray-400 mt-1">This may take a few moments</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 mb-2">⚠️ Error Loading Insights</div>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={fetchInsights}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : insights.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <Lightbulb className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-800 mb-2">No Insights Available</h3>
              <p className="text-yellow-700 mb-4">
                Add more customers, orders, or campaigns to generate personalized business insights.
              </p>
              <button
                onClick={fetchInsights}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
              >
                Check Again
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-xl font-semibold mb-2">🚀 Your Growth Opportunities</h2>
                <p className="text-indigo-100">
                  Based on your business data, here are {insights.length} actionable insights to boost your growth.
                </p>
              </div>

              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-3 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 rounded-full">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Growth Tip #{index + 1}
                        </h3>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                          AI Generated
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{insight}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Action Footer */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Ready to Grow?</h3>
                </div>
                <p className="text-blue-700 mb-4">
                  These insights are generated from your current business data. 
                  The more data you add, the more personalized your recommendations become.
                </p>
                <button
                  onClick={fetchInsights}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
                >
                  Get Fresh Insights
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;