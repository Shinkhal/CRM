import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import { usePipeline } from '../hooks/usePipeline';
import { listOf } from '../api/collections';
import {
  X,
  Building2,
  User,
  Calendar,
  IndianRupee,
  Clock,
  Pin,
  Send,
  Trash2,
  CheckCircle2,
  Square,
  AlertTriangle,
  History,
  MessageSquare,
  CheckSquare,
  Info,
  ChevronRight,
  PencilLine,
} from 'lucide-react';

const DealDetailDrawer = ({ deal, isOpen, onClose, onDealUpdated, onMarkLost }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeline, setTimeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isNotePinned, setIsNotePinned] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const { stages, stageMap, lostStageKey } = usePipeline();

  const fetchTimeline = useCallback(async () => {
    if (!deal?._id) return;
    setLoadingTimeline(true);
    try {
      const res = await axios.get('/notes/timeline', {
        params: { dealId: deal._id },
      });
      setTimeline(res.data || []);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  }, [deal?._id]);

  const fetchTasks = useCallback(async () => {
    if (!deal?._id) return;
    try {
      const res = await axios.get('/tasks', {
        params: { dealId: deal._id },
      });
      setTasks(listOf(res.data, 'tasks'));
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, [deal?._id]);

  useEffect(() => {
    if (isOpen && deal?._id) {
      fetchTimeline();
      fetchTasks();
    }
  }, [isOpen, deal?._id, fetchTimeline, fetchTasks]);

  if (!isOpen || !deal) return null;

  const handleStageSelect = async (newStage) => {
    if (newStage === deal.stage) return;
    if (newStage === lostStageKey) {
      onMarkLost(deal._id);
      return;
    }

    try {
      const res = await axios.put(`/deals/${deal._id}`, { stage: newStage });
      toast.success(`Stage updated to ${stageMap[newStage]?.label || newStage}`);
      onDealUpdated(res.data.deal);
      fetchTimeline();
    } catch (err) {
      console.error('Failed to update stage:', err);
      toast.error('Failed to update deal stage');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      await axios.post('/notes', {
        content: newNote.trim(),
        isPinned: isNotePinned,
        relatedDeal: deal._id,
        relatedCustomer: deal.customerId?._id,
      });

      setNewNote('');
      setIsNotePinned(false);
      toast.success('Note added');
      fetchTimeline();
    } catch (err) {
      console.error('Failed to add note:', err);
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleTogglePin = async (noteId) => {
    try {
      await axios.patch(`/notes/${noteId}/pin`);
      fetchTimeline();
    } catch (err) {
      console.error('Failed to pin note:', err);
      toast.error('Failed to update pin');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`/notes/${noteId}`);
      toast.success('Note removed');
      fetchTimeline();
    } catch (err) {
      console.error('Failed to delete note:', err);
      toast.error('Failed to delete note');
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await axios.put(`/tasks/${task._id}`, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t))
      );
      toast.success(nextStatus === 'completed' ? 'Task completed' : 'Task reopened');
    } catch (err) {
      console.error('Failed to update task:', err);
      toast.error('Failed to update task status');
    }
  };

  const currentStageObj = stageMap[deal.stage] || stages[0] || { label: deal.stage, theme: { chip: 'bg-slate-100 text-slate-800' } };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${currentStageObj.theme?.chip || 'bg-slate-100 text-slate-800'}`}>
                  {currentStageObj.label}
                </span>
                <span className="text-xs text-slate-300 font-semibold px-2 py-0.5 bg-white/10 rounded-full">
                  {deal.probability}% Win Prob
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
                  {deal.priority} priority
                </span>
              </div>
              <h2 className="text-xl font-bold text-white truncate">{deal.title}</h2>
              <div className="flex items-center gap-2 mt-1 text-slate-300 text-sm font-semibold">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-lg">
                  {Number(deal.value || 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-normal">Deal Value</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lost Deal Alert Banner */}
          {deal.stage === 'lost' && (
            <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  Deal Closed as Lost
                </p>
                <p className="text-sm font-semibold text-rose-700 mt-0.5">
                  Reason: {deal.lostReason || 'Not specified'}
                </p>
                {deal.lostNotes && (
                  <p className="text-xs text-rose-600 mt-1 italic">&ldquo;{deal.lostNotes}&rdquo;</p>
                )}
              </div>
            </div>
          )}

          {/* Stage Progression Selector Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Stage:
            </span>
            {stages.map((s, idx) => {
              const isCurrent = s.key === deal.stage;
              return (
                <button
                  key={s.key}
                  onClick={() => handleStageSelect(s.key)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                    isCurrent
                      ? `${s.theme?.chip || 'bg-slate-100 text-slate-800'} ring-2 ring-slate-900/10 shadow-sm font-bold`
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  <span>{s.label}</span>
                  {idx < stages.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 px-6 flex items-center gap-6 bg-white">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Timeline & Notes ({timeline.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Tasks ({tasks.length})</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Contact & Account Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span>Primary Contact</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {deal.customerId?.name || 'Unknown Contact'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{deal.customerId?.email}</p>
                    {deal.customerId?.phone && (
                      <p className="text-xs text-slate-500 mt-0.5">{deal.customerId.phone}</p>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <span>Organization</span>
                    </div>
                    {deal.organizationId ? (
                      <div>
                        <p className="text-sm font-bold text-slate-900">{deal.organizationId.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Industry: {deal.organizationId.industry || 'General'}
                        </p>
                        {deal.organizationId.website && (
                          <a
                            href={deal.organizationId.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-0.5 block truncate"
                          >
                            {deal.organizationId.website}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No organization linked</p>
                    )}
                  </div>
                </div>

                {/* Deal Details Panel */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Deal Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Expected Close:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {deal.expectedCloseDate
                          ? new Date(deal.expectedCloseDate).toLocaleDateString()
                          : 'Not scheduled'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Assigned Agent:</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {deal.assignedTo?.name || 'Unassigned'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Created On:</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Weighted Forecast:</span>
                      <span className="font-semibold text-emerald-600 mt-0.5 block">
                        ₹{Math.round(deal.value * (deal.probability / 100)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {deal.notes && (
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-slate-400 block font-medium text-xs mb-1">
                        Initial Description:
                      </span>
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">
                        {deal.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Custom Fields Panel if available */}
                {deal.customFields && Object.keys(deal.customFields).length > 0 && (
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Custom Attributes
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {Object.entries(deal.customFields).map(([key, val]) => (
                        <div key={key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 uppercase text-[10px] font-bold block">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE & NOTES TAB */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                {/* Note Composer */}
                <form
                  onSubmit={handleAddNote}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Add Internal Note</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNotePinned(!isNotePinned)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                        isNotePinned
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Pin className="w-3 h-3" />
                      <span>{isNotePinned ? 'Pinned' : 'Pin Note'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    required
                    placeholder="Log a client conversation, discussion update, or objection..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={addingNote || !newNote.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{addingNote ? 'Saving...' : 'Post Note'}</span>
                    </button>
                  </div>
                </form>

                {/* Timeline Stream */}
                {loadingTimeline ? (
                  <p className="text-center py-8 text-xs text-slate-400">Loading timeline...</p>
                ) : timeline.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-slate-200 p-6">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No activity logged yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Post notes or update stages to see chronological history here.
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {timeline.map((item, idx) => {
                      if (item.type === 'note') {
                        const note = item.data;
                        return (
                          <div key={note._id || idx} className="relative">
                            <span
                              className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                note.isPinned ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                              }`}
                            >
                              {note.isPinned ? <Pin className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                            </span>

                            <div
                              className={`bg-white p-3.5 rounded-xl border shadow-sm ${
                                note.isPinned ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-800">
                                    {note.author?.name || 'Team Member'}
                                  </span>
                                  {note.isPinned && (
                                    <span className="text-[9px] uppercase font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                                      Pinned
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(note.createdAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <button
                                    onClick={() => handleTogglePin(note._id)}
                                    className="text-slate-400 hover:text-amber-600"
                                    title="Toggle pin"
                                  >
                                    <Pin className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note._id)}
                                    className="text-slate-400 hover:text-rose-600"
                                    title="Delete note"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-slate-700 whitespace-pre-line">
                                {note.content}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      if (item.type === 'stage_change') {
                        const sc = item.data;
                        const stg = stageMap[sc.stage];
                        return (
                          <div key={idx} className="relative">
                            <span className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px]">
                              <History className="w-2.5 h-2.5" />
                            </span>
                            <div className="bg-slate-100/70 p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                              <span className="text-slate-700">
                                Stage transitioned to{' '}
                                <strong className="font-semibold text-slate-900">
                                  {stg?.label || sc.stage}
                                </strong>
                                {sc.changedBy?.name ? ` by ${sc.changedBy.name}` : ''}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (item.type === 'audit') {
                        const entry = item.data;
                        const actionLabel =
                          entry.action === 'create'
                            ? 'created'
                            : entry.action === 'delete'
                              ? 'deleted'
                              : 'updated';
                        const changes = Array.isArray(entry.changes) ? entry.changes : [];
                        return (
                          <div key={entry._id || idx} className="relative">
                            <span className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                              <PencilLine className="w-2.5 h-2.5" />
                            </span>
                            <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 text-xs">
                              <span className="text-slate-700">
                                <strong className="font-semibold text-slate-900">
                                  {entry.actor?.name || 'A team member'}
                                </strong>{' '}
                                {actionLabel} this record
                              </span>
                              {changes.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {changes.map((change) => (
                                    <li key={change.field} className="text-[11px] text-slate-600">
                                      <span className="font-semibold text-slate-800">
                                        {change.field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                      </span>
                                      {change.from !== undefined && change.from !== null && (
                                        <span className="line-through text-slate-400 ml-1">
                                          {String(change.from)}
                                        </span>
                                      )}
                                      {change.to !== undefined && change.to !== null && (
                                        <span className="ml-1 text-slate-800 font-medium">
                                          {String(change.to)}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <span className="text-[10px] text-slate-400 block mt-1">
                                {new Date(item.timestamp).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Follow-ups & Action Items
                  </span>
                </div>

                {tasks.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-slate-200 p-6">
                    <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No tasks linked</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Create follow-ups in the Tasks tab to stay ahead of this deal.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task._id}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className="text-slate-400 hover:text-blue-600"
                          >
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                          <span
                            className={`text-xs font-semibold ${
                              task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                        {task.dueDate && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealDetailDrawer;
