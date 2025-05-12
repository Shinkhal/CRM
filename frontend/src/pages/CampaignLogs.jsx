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

  useEffect(() => {
    fetchLogs();
  }, [id]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Delivered
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Failed
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SENT':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {campaign ? campaign.name : 'Campaign'} Delivery Status
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Detailed message delivery information and status
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Messages</div>
                <div className="text-2xl font-semibold text-gray-900">{statistics.total}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Delivered</div>
                <div className="text-2xl font-semibold text-gray-900">{statistics.sent}</div>
              </div>
            </div>
          </div> 
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-full p-3">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Failed</div>
                <div className="text-2xl font-semibold text-gray-900">{statistics.failed}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-full p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Pending</div>
                <div className="text-2xl font-semibold text-gray-900">{statistics.pending}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-800">Message Logs</h2>
            <button 
              onClick={fetchLogs}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-pulse flex space-x-4">
                <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
                <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
                <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500 font-medium">No message logs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-6">
              {logs.map((log) => {
                const formattedDate = formatDate(log.createdAt);
                return (
                  <div key={log._id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start">
                        {getStatusIcon(log.status)}
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <h3 className="text-lg font-medium text-gray-900">
                                {log.customerId?.name || 'Unknown Customer'}
                              </h3>
                              <div className="ml-2">
                                {getStatusBadge(log.status)}
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div>{formattedDate.date}</div>
                              <div>{formattedDate.time}</div>
                            </div>
                          </div>
                          
                          {log.customerId?.phone && (
                            <div className="text-sm text-gray-500 mt-1">
                              {log.customerId.phone}
                            </div>
                          )}
                          
                          <div className="mt-3 bg-gray-50 p-3 rounded-md">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Message</h4>
                            <p className="text-sm text-gray-800">{log.message}</p>
                          </div>
                          
                          <div className="mt-3">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Vendor Response</h4>
                            <p className="text-sm text-gray-600 italic">
                              {log.vendorResponse || 'No response data available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignLogs;