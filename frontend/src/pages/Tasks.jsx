import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/authContext.js';
import { useUser } from '../context/userContext.js';
import { toast } from 'react-toastify';
import {
  CheckSquare,
  Square,
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  CheckCircle2,
  Filter,
  User,
  X,
  Sparkles,
} from 'lucide-react';
import { listOf } from '../api/collections';

const Tasks = () => {
  const { accessToken } = useAuth();
  const { user } = useUser();
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'todo',
    relatedCustomer: '',
  });

  const fetchTasks = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;

      const res = await axios.get('/tasks', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
      setTasks(listOf(res.data, 'tasks'));
    } catch (err) {
      console.error('Failed to load tasks:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, priorityFilter]);

  const fetchCustomers = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await axios.get('/customers', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCustomers(listOf(res.data, 'customers'));
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      const res = await axios.put(
        `/tasks/${task._id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? res.data.task || { ...t, status: nextStatus } : t))
      );
      toast.success(nextStatus === 'completed' ? 'Task completed! 🎉' : 'Task marked as to-do');
    } catch (err) {
      console.error('Failed to update task:', err);
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast.success('Task removed');
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return toast.warning('Please enter a task title');
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        relatedCustomer: formData.relatedCustomer || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      };

      const res = await axios.post('/tasks', payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setTasks((prev) => [res.data.task, ...prev]);
      toast.success('Task scheduled successfully!');
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        status: 'todo',
        relatedCustomer: '',
      });
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
  const highPriorityTasks = tasks.filter((t) => t.priority === 'high' && t.status !== 'completed').length;

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'todo':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <CheckSquare className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Tasks & Activities
              </h1>
            </div>
            <p className="text-slate-500 mt-1 text-sm">
              Keep customer follow-ups, calls, and sales activities organized and on schedule.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Tasks</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalTasks}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{pendingTasks}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Completed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{completedTasks}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">High Priority</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{highPriorityTasks}</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-500 font-medium">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No tasks found</h3>
            <p className="text-slate-500 text-sm mb-6">
              {statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters to view more tasks.'
                : 'Stay ahead of deals and customer conversations by creating your first task.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const isOverdue =
                task.dueDate &&
                !isCompleted &&
                new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

              return (
                <div
                  key={task._id}
                  className={`bg-white rounded-xl border transition-all p-4 shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCompleted
                      ? 'border-slate-200 bg-slate-50/50 opacity-75'
                      : isOverdue
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <Square className="w-6 h-6 text-slate-300 hover:text-slate-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-base font-semibold leading-snug truncate ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </h4>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(
                            task.status
                          )}`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-500">
                        {task.dueDate && (
                          <div
                            className={`flex items-center gap-1.5 font-medium ${
                              isOverdue ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-semibold">
                                Overdue
                              </span>
                            )}
                          </div>
                        )}

                        {task.relatedCustomer && (
                          <div className="flex items-center gap-1 text-slate-600 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{task.relatedCustomer.name || task.relatedCustomer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(task._id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Task Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <CheckSquare className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Create New Task</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Follow up on enterprise proposal"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Details, talking points, or checklist..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Related Customer (Optional)
                  </label>
                  <select
                    value={formData.relatedCustomer}
                    onChange={(e) => setFormData({ ...formData, relatedCustomer: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Customer Linked</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default Tasks;
