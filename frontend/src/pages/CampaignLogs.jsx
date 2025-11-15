import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../api/axios';
import Navbar from '../components/Navbar';

const CampaignLogs = () => {
  const { id } = useParams();
  const [logs, setLogs] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    sent: 0,
    failed: 0,
    pending: 0,
    total: 0
  });

  

  useEffect(() => {
    const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/logs/${id}`);
      setLogs(res.data);
      const stats = res.data.reduce((acc, log) => {
        acc.total++;
        if (log.status === 'SENT') acc.sent++;
        else if (log.status === 'FAILED') acc.failed++;
        else if (log.status === 'PENDING') acc.pending++;
        return acc;
      }, { sent: 0, failed: 0, pending: 0, total: 0 });
      
      setStatistics(stats);
      
      try {
        const campaignRes = await axios.get(`/campaigns`);
        setCampaign(campaignRes.data);
      } catch (err) {
        console.error('Error fetching campaign details:', err);
      }
    } catch (err) {
      toast.error('Failed to fetch campaign logs. Please try again.');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };
    fetchLogs();
  }, [id]);

  const getStatusBadge = (status) => {
    const styles = {
      SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      FAILED: 'bg-red-50 text-red-700 border-red-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      default: 'bg-gray-50 text-gray-700 border-gray-200'
    };
    
    const labels = {
      SENT: 'Delivered',
      FAILED: 'Failed',
      PENDING: 'Pending'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.default}`}>
        {labels[status] || status}
      </span>
    );
  };

  const StatCard = ({ title, value, color }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-200 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`h-2 w-2 rounded-full ${color}`}></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {campaign ? campaign.name : 'Campaign'} Delivery Status
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Detailed message delivery information and status
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Messages" 
            value={statistics.total} 
            color="bg-blue-500" 
          />
          <StatCard 
            title="Delivered" 
            value={statistics.sent} 
            color="bg-emerald-500" 
          />
          <StatCard 
            title="Failed" 
            value={statistics.failed} 
            color="bg-red-500" 
          />
          <StatCard 
            title="Pending" 
            value={statistics.pending} 
            color="bg-amber-500" 
          />
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Delivery Logs</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No delivery logs found</p>
              <p className="text-gray-400 text-sm mt-1">Messages will appear here once the campaign starts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {(log.customerId?.name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {log.customerId?.name || 'Unknown Customer'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.customerId?.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {log.vendorResponse || 'No response data'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignLogs;