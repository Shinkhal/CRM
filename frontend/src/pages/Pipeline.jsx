import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import DealDetailDrawer from '../components/DealDetailDrawer';
import LostReasonModal from '../components/LostReasonModal';
import CustomFieldsManager from '../components/CustomFieldsManager';
import { usePipeline } from '../hooks/usePipeline';
import { listOf } from '../api/collections';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Plus,
  Calendar,
  User,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Phone,
  Layers,
  Clock,
  Sparkles,
  Sliders,
  Building2,
  Eye,
  AlertTriangle,
  BarChart3,
  Settings2,
} from 'lucide-react';

const priorityStyles = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

const Pipeline = () => {
  const [deals, setDeals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [draggedDealId, setDraggedDealId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const { stages, stageLabel, lostStageKey } = usePipeline();

  // Modals & Drawers state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dealToMarkLost, setDealToMarkLost] = useState(null);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const [dealForm, setDealForm] = useState({
    title: '',
    customerId: '',
    organizationId: '',
    value: '',
    stage: 'lead',
    probability: 30,
    expectedCloseDate: '',
    priority: 'medium',
    notes: '',
    customFields: {},
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, summaryRes, customersRes, orgsRes, cfRes] = await Promise.all([
        axios.get('/deals'),
        axios.get('/deals/pipeline-summary'),
        axios.get('/customers'),
        axios.get('/organizations').catch(() => ({ data: [] })),
        axios.get('/business/custom-fields').catch(() => ({ data: [] })),
      ]);

      setDeals(listOf(dealsRes.data, 'deals'));
      setSummary(summaryRes.data || null);
      setCustomers(listOf(customersRes.data, 'customers'));
      setOrganizations(listOf(orgsRes.data, 'organizations'));
      setCustomFields(listOf(cfRes.data, 'customFields').filter((f) => f.entity === 'deal'));
    } catch (err) {
      console.error('Failed to load sales pipeline:', err);
      toast.error('Failed to load sales pipeline data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stage change handler
  const handleStageChange = async (dealId, nextStage) => {
    if (nextStage === lostStageKey) {
      const targetDeal = deals.find((d) => d._id === dealId);
      setDealToMarkLost(targetDeal || { _id: dealId, title: 'Selected Deal' });
      setIsLostModalOpen(true);
      return;
    }

    try {
      await axios.put(`/deals/${dealId}`, { stage: nextStage });
      toast.success(`Deal moved to ${stageLabel(nextStage)}`);
      setDeals((prev) =>
        prev.map((d) => (d._id === dealId ? { ...d, stage: nextStage } : d))
      );
      const summaryRes = await axios.get('/deals/pipeline-summary');
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to update deal stage:', err);
      toast.error('Failed to move deal');
    }
  };

  // Lost deal confirmation from modal
  const handleConfirmLost = async ({ lostReason, lostNotes }) => {
    if (!dealToMarkLost?._id) return;
    try {
      const res = await axios.put(`/deals/${dealToMarkLost._id}`, {
        stage: lostStageKey,
        lostReason,
        lostNotes,
      });

      toast.info('Deal archived as lost with intelligence recorded');
      setDeals((prev) =>
        prev.map((d) => (d._id === dealToMarkLost._id ? res.data.deal || { ...d, stage: lostStageKey, lostReason, lostNotes } : d))
      );
      if (selectedDeal?._id === dealToMarkLost._id) {
        setSelectedDeal(res.data.deal);
      }
      const summaryRes = await axios.get('/deals/pipeline-summary');
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to mark deal lost:', err);
      toast.error('Failed to update deal as lost');
    }
  };

  // Delete deal handler
  const handleDeleteDeal = async (dealId) => {
    if (!window.confirm('Are you sure you want to remove this deal?')) return;
    try {
      await axios.delete(`/deals/${dealId}`);
      toast.success('Deal deleted');
      setDeals((prev) => prev.filter((d) => d._id !== dealId));
      if (selectedDeal?._id === dealId) {
        setIsDrawerOpen(false);
      }
      const summaryRes = await axios.get('/deals/pipeline-summary');
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to delete deal:', err);
      toast.error('Failed to delete deal');
    }
  };

  // Create deal submit
  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!dealForm.title || !dealForm.customerId) {
      toast.warning('Please enter deal title and select a customer');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/deals', {
        ...dealForm,
        value: Number(dealForm.value) || 0,
        probability: Number(dealForm.probability) || 20,
        organizationId: dealForm.organizationId || undefined,
      });

      toast.success('Deal created successfully!');
      setIsModalOpen(false);
      setDealForm({
        title: '',
        customerId: '',
        organizationId: '',
        value: '',
        stage: 'lead',
        probability: 30,
        expectedCloseDate: '',
        priority: 'medium',
        notes: '',
        customFields: {},
      });
      fetchData();
    } catch (err) {
      console.error('Error creating deal:', err);
      toast.error(err.response?.data?.message || 'Failed to create deal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = (deal) => {
    setSelectedDeal(deal);
    setIsDrawerOpen(true);
  };

  const handleDealUpdated = (updatedDeal) => {
    setDeals((prev) => prev.map((d) => (d._id === updatedDeal._id ? updatedDeal : d)));
    setSelectedDeal(updatedDeal);
  };

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.customerId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.organizationId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || deal.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getStageIndex = (stageKey) => stages.findIndex((s) => s.key === stageKey);

  /**
   * Drag and drop between columns. The board is the primary way a rep moves a
   * deal, so the card is draggable and each column accepts a drop.
   */
  const handleDragStart = (event, dealId) => {
    setDraggedDealId(dealId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragOver = (event, stageKey) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageKey) setDragOverStage(stageKey);
  };

  const handleDrop = async (event, stageKey) => {
    event.preventDefault();
    const dealId = event.dataTransfer.getData('text/plain') || draggedDealId;
    setDragOverStage(null);
    setDraggedDealId(null);
    if (!dealId) return;

    const deal = deals.find((d) => d._id === dealId);
    if (!deal || deal.stage === stageKey) return;

    await handleStageChange(dealId, stageKey);
  };

  const handleDragEnd = () => {
    setDraggedDealId(null);
    setDragOverStage(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header and Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Frappe CRM-Style Visual Pipeline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Sales Pipeline & Deals
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track opportunities, stage transitions, timeline feeds, and weighted closing forecasts in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => setIsCustomFieldsOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-sm transition-all"
              title="Configure custom attributes on deals"
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Custom Fields</span>
            </button>

            <button
              onClick={() => navigate('/forecast')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-sm transition-all"
              title="Time based revenue forecast"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Forecast</span>
            </button>

            <button
              onClick={() => navigate('/pipeline-settings')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-sm transition-all"
              title="Configure pipeline stages and win probabilities"
            >
              <Settings2 className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Stages</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Deal</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Bar */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Total Pipeline Value
              </span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">
                ₹{(summary.totalPipelineValue || 0).toLocaleString()}
              </span>
              <span className="text-xs text-blue-600 font-medium mt-1 inline-flex items-center">
                <span>{summary.totalDeals || 0} total opportunities</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Weighted Forecast
              </span>
              <span className="text-2xl font-black text-indigo-600 mt-1 block">
                ₹{(summary.weightedForecast || 0).toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 font-medium mt-1 inline-flex items-center">
                <span>Probability weighted</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Win Rate
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {summary.winRate || 0}%
              </span>
              <span className="text-xs text-emerald-600 font-medium mt-1 inline-flex items-center">
                <span>₹{(summary.wonValue || 0).toLocaleString()} won</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Active Deals
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {summary.activeDeals || 0}
              </span>
              <span className="text-xs text-gray-500 font-medium mt-1 inline-flex items-center">
                <span>In progress stages</span>
              </span>
            </div>
          </div>
        )}

        {/* Loss analytics: the breakdown was always computed by the API but
            never rendered, so the reason data was collected and discarded. */}
        {summary && summary.lostReasons && summary.lostReasons.length > 0 && (
          <div className="mb-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-gray-900">Why deals are lost</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {summary.lostReasons.map((item) => (
                <div key={item.reason} className="bg-rose-50/60 border border-rose-100 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider block truncate">
                    {item.reason}
                  </span>
                  <span className="text-lg font-black text-gray-900 mt-0.5 block">
                    {item.count} deal{item.count === 1 ? '' : 's'}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    ₹{(item.totalValue || 0).toLocaleString()} lost
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deal, contact, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
            <span className="text-gray-400 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Pipeline Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="inline-flex gap-4 min-w-full">
              {stages.map((stage) => {
                const stageDeals = filteredDeals.filter((d) => d.stage === stage.key);
                const stageTotalValue = stageDeals.reduce((acc, d) => acc + (d.value || 0), 0);
                const StageIcon = stage.theme.icon;
                const isDropTarget = dragOverStage === stage.key;

                return (
                  <div
                    key={stage.key}
                    onDragOver={(event) => handleDragOver(event, stage.key)}
                    onDragLeave={() => setDragOverStage((prev) => (prev === stage.key ? null : prev))}
                    onDrop={(event) => handleDrop(event, stage.key)}
                    className={`w-80 flex-shrink-0 flex flex-col rounded-2xl bg-white/70 backdrop-blur-sm border shadow-sm overflow-hidden transition-colors ${
                      isDropTarget ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200'
                    }`}
                  >
                    {/* Stage Header */}
                    <div className="p-3.5 border-b border-gray-200 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`p-1.5 rounded-lg ${stage.theme.header}`}>
                            <StageIcon className="w-4 h-4" />
                          </span>
                          <span className="font-bold text-sm text-gray-900">{stage.label}</span>
                          <span className="text-[10px] font-bold text-gray-400" title="Stage win probability">
                            {stage.probability}%
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {stageDeals.length}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between font-medium">
                        <span>Total:</span>
                        <span className="font-bold text-gray-900">
                          ₹{stageTotalValue.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Stage Deal Cards List */}
                    <div className="flex-1 p-3 space-y-3 min-h-[420px] max-h-[700px] overflow-y-auto bg-slate-50/50">
                      {stageDeals.length === 0 ? (
                        <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400 font-medium">
                          No deals in this stage
                        </div>
                      ) : (
                        stageDeals.map((deal) => {
                          const currentIdx = getStageIndex(deal.stage);
                          const canMovePrev = currentIdx > 0;
                          const canMoveNext = currentIdx < stages.length - 1;

                          return (
                            <div
                              key={deal._id}
                              draggable
                              onDragStart={(event) => handleDragStart(event, deal._id)}
                              onDragEnd={handleDragEnd}
                              className={`bg-white p-4 rounded-xl border shadow-sm transition-all duration-150 flex flex-col justify-between group cursor-pointer ${
                                draggedDealId === deal._id
                                  ? 'border-blue-400 opacity-60'
                                  : 'border-gray-200 hover:shadow-md'
                              }`}
                              onClick={() => handleOpenDetail(deal)}
                            >
                              <div>
                                {/* Top tag row */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityStyles[deal.priority] || priorityStyles.medium}`}>
                                    {deal.priority}
                                  </span>

                                  <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                      {deal.probability}% win
                                    </span>
                                    <button
                                      onClick={() => handleDeleteDeal(deal._id)}
                                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                      title="Delete Deal"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Deal Title */}
                                <h3 className="text-sm font-bold text-gray-900 mb-1 leading-snug group-hover:text-blue-600 transition-colors">
                                  {deal.title}
                                </h3>

                                {/* Customer Info */}
                                <div className="flex items-center space-x-1.5 text-xs text-gray-600 mb-1.5">
                                  <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate">{deal.customerId?.name || 'Unknown Contact'}</span>
                                </div>

                                {/* Linked Organization */}
                                {deal.organizationId && (
                                  <div className="flex items-center space-x-1.5 text-xs text-indigo-600 mb-2">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span className="truncate font-medium">{deal.organizationId.name}</span>
                                  </div>
                                )}

                                {/* Deal Value */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 mb-2">
                                  <span className="text-xs text-gray-400 font-medium">Deal Value</span>
                                  <span className="text-sm font-black text-gray-900">
                                    ₹{(deal.value || 0).toLocaleString()}
                                  </span>
                                </div>

                                {deal.stage === lostStageKey && deal.lostReason && (
                                  <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-100 p-1.5 rounded-lg mb-2">
                                    <span className="font-bold">Lost:</span> {deal.lostReason}
                                  </div>
                                )}
                              </div>

                              {/* Stage Movement Controls */}
                              <div
                                className="pt-2 border-t border-gray-100 flex items-center justify-between"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  disabled={!canMovePrev}
                                  onClick={() => handleStageChange(deal._id, stages[currentIdx - 1].key)}
                                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                                    canMovePrev
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      : 'text-gray-300 cursor-not-allowed opacity-40'
                                  }`}
                                  title={canMovePrev ? `Move to ${stages[currentIdx - 1].label}` : ''}
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleOpenDetail(deal)}
                                  className="text-[10px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Details</span>
                                </button>

                                <button
                                  disabled={!canMoveNext}
                                  onClick={() => handleStageChange(deal._id, stages[currentIdx + 1].key)}
                                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                                    canMoveNext
                                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                      : 'text-gray-300 cursor-not-allowed opacity-40'
                                  }`}
                                  title={canMoveNext ? `Move to ${stages[currentIdx + 1].label}` : ''}
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* New Deal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Create New Deal</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Deal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud License Rollout"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Primary Customer / Contact *
                </label>
                <select
                  required
                  value={dealForm.customerId}
                  onChange={(e) => setDealForm({ ...dealForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  <option value="">Select a customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {organizations.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Organization / Corporate Account (Optional)
                  </label>
                  <select
                    value={dealForm.organizationId}
                    onChange={(e) => setDealForm({ ...dealForm, organizationId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="">No Corporate Account</option>
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>
                        {org.name} ({org.industry || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Deal Value (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 150000"
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Initial Stage
                  </label>
                  <select
                    value={dealForm.stage}
                    onChange={(e) => {
                      const nextStage = e.target.value;
                      const stage = stages.find((s) => s.key === nextStage);
                      setDealForm({
                        ...dealForm,
                        stage: nextStage,
                        // The stage carries the forecast weight, so the default
                        // probability follows it unless it was set by hand.
                        probability: stage ? stage.probability : dealForm.probability,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    {stages.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={dealForm.priority}
                    onChange={(e) => setDealForm({ ...dealForm, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Win Probability ({dealForm.probability}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={dealForm.probability}
                    onChange={(e) => setDealForm({ ...dealForm, probability: Number(e.target.value) })}
                    className="w-full mt-2 accent-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={dealForm.expectedCloseDate}
                  onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Deal Notes / Strategy
                </label>
                <textarea
                  rows={2}
                  placeholder="Key decision makers, deal context, or competitor notes..."
                  value={dealForm.notes}
                  onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                ></textarea>
              </div>

              {customFields.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Custom Attributes
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {customFields.map((cf) => (
                      <div key={cf.id}>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          {cf.label} {cf.required && '*'}
                        </label>
                        {cf.type === 'select' ? (
                          <select
                            value={dealForm.customFields[cf.key] || ''}
                            onChange={(e) =>
                              setDealForm({
                                ...dealForm,
                                customFields: { ...dealForm.customFields, [cf.key]: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                          >
                            <option value="">Select an option</option>
                            {cf.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                            value={dealForm.customFields[cf.key] || ''}
                            onChange={(e) =>
                              setDealForm({
                                ...dealForm,
                                customFields: { ...dealForm.customFields, [cf.key]: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Deal Detail Drawer */}
      <DealDetailDrawer
        deal={selectedDeal}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onDealUpdated={handleDealUpdated}
        onMarkLost={(dealId) => {
          setDealToMarkLost(selectedDeal || { _id: dealId });
          setIsLostModalOpen(true);
        }}
      />

      {/* Lost Reason Confirmation Modal */}
      <LostReasonModal
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        onConfirm={handleConfirmLost}
        dealTitle={dealToMarkLost?.title}
      />

      {/* Dynamic Custom Fields Manager Modal */}
      <CustomFieldsManager
        isOpen={isCustomFieldsOpen}
        onClose={() => {
          setIsCustomFieldsOpen(false);
          fetchData();
        }}
      />
    </div>
  );
};

export default Pipeline;
