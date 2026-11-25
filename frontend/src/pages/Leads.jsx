import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import axios from '../api/axios';
import { listOf } from '../api/collections';
import {
  Flame,
  Thermometer,
  Snowflake,
  RefreshCw,
  UserCheck,
  Users,
  TrendingUp,
  Building2,
  Search,
} from 'lucide-react';

const TEMPERATURE_META = {
  hot: {
    label: 'Hot',
    icon: Flame,
    chip: 'bg-rose-100 text-rose-700 border-rose-200',
    accent: 'text-rose-600',
  },
  warm: {
    label: 'Warm',
    icon: Thermometer,
    chip: 'bg-amber-100 text-amber-700 border-amber-200',
    accent: 'text-amber-600',
  },
  cold: {
    label: 'Cold',
    icon: Snowflake,
    chip: 'bg-sky-100 text-sky-700 border-sky-200',
    accent: 'text-sky-600',
  },
};

const STATUS_META = {
  lead: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  customer: 'bg-emerald-100 text-emerald-700',
  churned: 'bg-rose-100 text-rose-700',
};

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [temperature, setTemperature] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (temperature !== 'all') params.temperature = temperature;
      const res = await axios.get('/customers/leads', { params });
      setLeads(listOf(res.data, 'leads'));
      setSummary(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to load leads:', err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [temperature]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleConvert = async (lead) => {
    setBusyId(lead._id);
    try {
      await axios.post(`/customers/${lead._id}/convert`);
      toast.success(`${lead.name} converted to a customer`);
      fetchLeads();
    } catch (err) {
      console.error('Failed to convert lead:', err);
      toast.error(err.response?.data?.message || 'Failed to convert lead');
    } finally {
      setBusyId(null);
    }
  };

  const handleRescore = async (lead) => {
    setBusyId(lead._id);
    try {
      const res = await axios.post(`/customers/${lead._id}/rescore`);
      toast.success(`Score recalculated: ${res.data.customer.leadScore}/100`);
      fetchLeads();
    } catch (err) {
      console.error('Failed to rescore lead:', err);
      toast.error('Failed to rescore lead');
    } finally {
      setBusyId(null);
    }
  };

  const visibleLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter(
      (lead) =>
        lead.name?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.organizationId?.name?.toLowerCase().includes(term)
    );
  }, [leads, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Lead Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every contact starts as a lead. Scores are recalculated from engagement and value, and a
            qualified lead converts into a paying customer.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All temperatures</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {['hot', 'warm', 'cold'].map((key) => {
            const meta = TEMPERATURE_META[key];
            const bucket = summary[key] || { count: 0, totalSpend: 0, averageScore: 0 };
            const Icon = meta.icon;
            return (
              <div key={key} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {meta.label} leads
                  </span>
                  <Icon className={`w-4 h-4 ${meta.accent}`} />
                </div>
                <span className="text-2xl font-black text-gray-900 block">{bucket.count}</span>
                <span className="text-xs text-gray-500 font-medium">
                  Avg score {bucket.averageScore} · ₹{(bucket.totalSpend || 0).toLocaleString()} spend
                </span>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : visibleLeads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No leads in this view</p>
          <p className="text-xs text-gray-400 mt-1">
            Contacts with the status lead, contacted or qualified appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleLeads.map((lead) => {
                  const meta = TEMPERATURE_META[lead.temperature] || TEMPERATURE_META.cold;
                  const Icon = meta.icon;
                  return (
                    <tr key={lead._id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-gray-900 block">{lead.name}</span>
                        <span className="text-xs text-gray-500">{lead.email}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {lead.organizationId ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                            {lead.organizationId.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Unlinked</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            STATUS_META[lead.status] || STATUS_META.lead
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg border ${meta.chip}`}
                          title={lead.leadScoreReasons?.join(' · ')}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {lead.leadScore ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        ₹{(lead.totalSpend || 0).toLocaleString()}
                        <span className="text-xs text-gray-400 font-normal block">
                          {lead.totalOrders || 0} order{lead.totalOrders === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRescore(lead)}
                            disabled={busyId === lead._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                            title="Recalculate the lead score from engagement and value"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Rescore
                          </button>
                          <button
                            onClick={() => handleConvert(lead)}
                            disabled={busyId === lead._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                            title="Convert this lead into a paying customer"
                          >
                            <UserCheck className="w-3 h-3" />
                            Convert
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
