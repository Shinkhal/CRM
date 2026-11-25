import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axios from '../api/axios';
import { BarChart3, CalendarRange, TrendingUp } from 'lucide-react';

const currency = (value) => `₹${Math.round(Number(value || 0)).toLocaleString()}`;

/**
 * Time based revenue forecast. Weighted value is the expected close value per
 * period: each deal contributes its value multiplied by its stage probability.
 */
const Forecast = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);
  const [granularity, setGranularity] = useState('month');

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/deals/forecast', { params: { months, granularity } });
      setForecast(res.data);
    } catch (err) {
      console.error('Failed to load forecast:', err);
      toast.error('Failed to load the revenue forecast');
    } finally {
      setLoading(false);
    }
  }, [months, granularity]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const buckets = forecast?.forecast || [];
  const maxValue = Math.max(1, ...buckets.map((b) => b.weightedValue || 0));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Revenue Forecast</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Time based forecast
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Expected revenue grouped by close period, weighted by the win probability of each stage.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <CalendarRange className="w-4 h-4 text-gray-400" />
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
            </select>
          </div>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {forecast?.totals && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Open pipeline
                </span>
                <span className="text-2xl font-black text-gray-900 mt-1 block">
                  {currency(forecast.totals.pipelineValue)}
                </span>
                <span className="text-xs text-gray-500 font-medium mt-1 inline-flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {forecast.totals.dealCount} scheduled deal
                  {forecast.totals.dealCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Weighted forecast
                </span>
                <span className="text-2xl font-black text-indigo-600 mt-1 block">
                  {currency(forecast.totals.weightedValue)}
                </span>
                <span className="text-xs text-gray-500 font-medium mt-1 inline-flex items-center">
                  Probability adjusted
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Closed won
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {currency(forecast.totals.wonValue)}
                </span>
                <span className="text-xs text-gray-500 font-medium mt-1 inline-flex items-center">
                  In the selected period
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Closed lost
                </span>
                <span className="text-2xl font-black text-rose-600 mt-1 block">
                  {currency(forecast.totals.lostValue)}
                </span>
                <span className="text-xs text-gray-500 font-medium mt-1 inline-flex items-center">
                  In the selected period
                </span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-6">Weighted revenue by period</h2>

            {buckets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No deals have an expected close date in this range.
              </p>
            ) : (
              <>
                <div className="flex items-end gap-2 h-56 mb-2">
                  {buckets.map((bucket) => {
                    const height = Math.max(4, ((bucket.weightedValue || 0) / maxValue) * 100);
                    return (
                      <div key={bucket.period} className="flex-1 flex flex-col items-center gap-2 group">
                        <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          {currency(bucket.weightedValue)}
                        </span>
                        <div
                          className="w-full bg-gradient-to-t from-indigo-500 to-blue-400 rounded-t-lg transition-all hover:from-indigo-600 hover:to-blue-500"
                          style={{ height: `${height}%` }}
                          title={`${bucket.period}: ${currency(bucket.weightedValue)} weighted, ${currency(
                            bucket.pipelineValue
                          )} pipeline`}
                        ></div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-end gap-2 border-t border-gray-100 pt-2">
                  {buckets.map((bucket) => (
                    <div key={bucket.period} className="flex-1 text-center">
                      <span className="text-[10px] font-semibold text-gray-500">{bucket.period}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Period', 'Deals', 'Pipeline', 'Weighted', 'Won', 'Lost'].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {buckets.map((bucket) => (
                    <tr key={bucket.period} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">{bucket.period}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{bucket.count}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{currency(bucket.pipelineValue)}</td>
                      <td className="px-5 py-3 text-sm font-bold text-indigo-600">
                        {currency(bucket.weightedValue)}
                      </td>
                      <td className="px-5 py-3 text-sm text-emerald-600">{currency(bucket.wonValue)}</td>
                      <td className="px-5 py-3 text-sm text-rose-600">{currency(bucket.lostValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Forecast;
