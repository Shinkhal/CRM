import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import axios from '../api/axios';
import {
  Workflow as WorkflowIcon,
  Plus,
  Trash2,
  Play,
  Power,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Zap,
  Save,
  X,
  ListChecks,
  FileText,
} from 'lucide-react';

const EVENT_LABELS = {
  'deal.created': 'A deal is created',
  'deal.updated': 'A deal is updated',
  'deal.stage_changed': 'A deal changes stage',
  'deal.won': 'A deal is won',
  'deal.lost': 'A deal is lost',
  'customer.created': 'A contact is created',
  'customer.updated': 'A contact is updated',
  'customer.status_changed': 'A contact changes stage',
  'customer.converted': 'A lead is converted',
  'task.created': 'A task is created',
  'task.completed': 'A task is completed',
  'task.overdue': 'A task becomes overdue',
  'note.created': 'A note is added',
  'campaign.sent': 'A campaign is sent',
  manual: 'Only when run manually',
};

const FILTER_OPERATORS = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'in', label: 'is one of' },
  { value: 'not_in', label: 'is not one of' },
  { value: 'exists', label: 'is set' },
];

const RUN_STATUS_META = {
  completed: { label: 'Completed', chip: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  failed: { label: 'Failed', chip: 'bg-rose-100 text-rose-700', icon: AlertCircle },
  waiting: { label: 'Waiting', chip: 'bg-amber-100 text-amber-700', icon: Clock },
  running: { label: 'Running', chip: 'bg-blue-100 text-blue-700', icon: Loader2 },
  skipped: { label: 'Skipped', chip: 'bg-slate-100 text-slate-600', icon: ChevronRight },
};

const emptyDraft = () => ({
  name: '',
  description: '',
  enabled: true,
  trigger: { event: 'deal.stage_changed', filters: [] },
  conditions: '',
  actions: [{ id: `step_${Date.now()}`, actionType: 'create_task', params: {}, condition: '', continueOnError: false }],
});

const Workflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [catalogue, setCatalogue] = useState({ events: [], actions: [], writableFields: {} });
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [workflowRes, catalogueRes, runsRes] = await Promise.all([
        axios.get('/workflows'),
        axios.get('/workflows/catalogue'),
        axios.get('/workflows/runs?limit=25'),
      ]);
      setWorkflows(workflowRes.data?.workflows || []);
      setCatalogue(catalogueRes.data || { events: [], actions: [], writableFields: {} });
      setRuns(runsRes.data?.runs || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selected = useMemo(
    () => workflows.find((workflow) => workflow._id === selectedId) || null,
    [workflows, selectedId]
  );

  const actionCatalogue = useMemo(() => {
    const map = {};
    for (const action of catalogue.actions || []) map[action.type] = action;
    return map;
  }, [catalogue]);

  const startNew = () => {
    setDraft(emptyDraft());
    setSelectedId(null);
    setEditing(true);
  };

  const startEdit = (workflow) => {
    setDraft({
      name: workflow.name || '',
      description: workflow.description || '',
      enabled: workflow.enabled !== false,
      trigger: {
        event: workflow.trigger?.event || 'deal.stage_changed',
        filters: workflow.trigger?.filters || [],
      },
      conditions: workflow.conditions || '',
      actions: (workflow.actions || []).map((action) => ({
        id: action.id,
        actionType: action.actionType,
        params: { ...(action.params || {}) },
        condition: action.condition || '',
        continueOnError: Boolean(action.continueOnError),
      })),
    });
    setSelectedId(workflow._id);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        enabled: draft.enabled,
        trigger: draft.trigger,
        conditions: draft.conditions,
        actions: draft.actions,
      };

      if (selectedId) {
        await axios.put(`/workflows/${selectedId}`, payload);
        toast.success('Workflow updated');
      } else {
        const res = await axios.post('/workflows', payload);
        setSelectedId(res.data?.workflow?._id || null);
        toast.success('Workflow created');
      }
      setEditing(false);
      fetchAll();
    } catch (err) {
      console.error('Failed to save workflow:', err);
      toast.error(err.response?.data?.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (workflow) => {
    try {
      await axios.post(`/workflows/${workflow._id}/toggle`, { enabled: !workflow.enabled });
      toast.success(workflow.enabled ? 'Workflow disabled' : 'Workflow enabled');
      fetchAll();
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
      toast.error('Failed to update the workflow');
    }
  };

  const handleDelete = async (workflow) => {
    if (!window.confirm(`Delete "${workflow.name}"?`)) return;
    try {
      await axios.delete(`/workflows/${workflow._id}`);
      toast.success('Workflow deleted');
      if (selectedId === workflow._id) {
        setSelectedId(null);
        setDraft(null);
        setEditing(false);
      }
      fetchAll();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      toast.error('Failed to delete the workflow');
    }
  };

  const handleCheckExpression = async (expression) => {
    if (!expression || !expression.trim()) {
      toast.info('The expression is empty, so it always passes');
      return;
    }
    try {
      const res = await axios.post('/workflows/validate', { expression });
      if (res.data?.valid) {
        toast.success('The expression is valid');
      } else {
        toast.error(res.data?.error || 'The expression is not valid');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'The expression is not valid');
    }
  };

  const entityForEvent = (event) => {
    if (!event) return null;
    if (event.startsWith('deal')) return 'deal';
    if (event.startsWith('customer')) return 'customer';
    if (event.startsWith('task')) return 'task';
    if (event.startsWith('note')) return 'note';
    if (event.startsWith('campaign')) return 'campaign';
    return null;
  };

  const handleRunNow = async (workflow) => {
    const entity = entityForEvent(workflow.trigger?.event);
    if (!entity) {
      toast.error('This workflow has no record to run against');
      return;
    }

    setRunning(true);
    try {
      const listPath = {
        deal: '/deals?limit=1',
        customer: '/customers?limit=1',
        task: '/tasks?limit=1',
        note: '/notes?limit=1',
        campaign: '/campaigns?limit=1',
      }[entity];

      const listRes = await axios.get(listPath);
      const payload = listRes.data;
      const records = Array.isArray(payload)
        ? payload
        : payload?.[entity === 'note' ? 'notes' : entity === 'campaign' ? 'campaigns' : `${entity}s`] || [];

      if (records.length === 0) {
        toast.error(`There is no ${entity} to run this workflow against`);
        return;
      }

      const record = records[0];
      const res = await axios.post(`/workflows/${workflow._id}/run`, {
        entity,
        entityId: record._id,
      });

      const status = res.data?.run?.status;
      if (status === 'completed') {
        toast.success('Workflow ran successfully');
      } else if (status === 'failed') {
        toast.error(res.data?.run?.error || 'The workflow run failed');
      } else {
        toast.info(`Workflow run ${status}`);
      }
      fetchAll();
    } catch (err) {
      console.error('Failed to run the workflow:', err);
      toast.error(err.response?.data?.message || 'Failed to run the workflow');
    } finally {
      setRunning(false);
    }
  };

  const updateAction = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      actions: prev.actions.map((action, i) => (i === index ? { ...action, ...patch } : action)),
    }));
  };

  const updateActionParam = (index, key, value) => {
    setDraft((prev) => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === index ? { ...action, params: { ...action.params, [key]: value } } : action
      ),
    }));
  };

  const addAction = () => {
    setDraft((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        { id: `step_${Date.now()}_${prev.actions.length}`, actionType: 'create_task', params: {}, condition: '', continueOnError: false },
      ],
    }));
  };

  const removeAction = (index) => {
    setDraft((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const moveAction = (index, direction) => {
    setDraft((prev) => {
      const next = [...prev.actions];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, actions: next };
    });
  };

  const renderParam = (action, definition, index) => {
    const value = action.params?.[definition.key];
    const onChange = (next) => updateActionParam(index, definition.key, next);

    if (definition.type === 'fields') {
      const fields = Array.isArray(value) ? value : [];
      const writable = catalogue.writableFields || {};
      const entity = draft?.trigger?.event?.startsWith('deal')
        ? 'deal'
        : draft?.trigger?.event?.startsWith('customer')
          ? 'customer'
          : draft?.trigger?.event?.startsWith('task')
            ? 'task'
            : 'organization';

      return (
        <div className="space-y-2">
          {fields.map((entry, fieldIndex) => (
            <div key={fieldIndex} className="flex gap-2 items-center">
              <select
                value={entry.field || ''}
                onChange={(e) => {
                  const next = [...fields];
                  next[fieldIndex] = { ...entry, field: e.target.value };
                  onChange(next);
                }}
                className="flex-1 px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Pick a field</option>
                {(writable[entity] || []).map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={entry.value || ''}
                placeholder="New value"
                onChange={(e) => {
                  const next = [...fields];
                  next[fieldIndex] = { ...entry, value: e.target.value };
                  onChange(next);
                }}
                className="flex-1 px-2.5 py-2 text-xs border border-gray-200 rounded-lg"
              />
              <button
                type="button"
                onClick={() => onChange(fields.filter((_, i) => i !== fieldIndex))}
                className="text-gray-300 hover:text-rose-500 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange([...fields, { field: '', value: '' }])}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
          >
            + Add field
          </button>
        </div>
      );
    }

    if (definition.type === 'select') {
      return (
        <select
          value={value ?? definition.default ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {(definition.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (definition.type === 'boolean') {
      return (
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          {definition.label}
        </label>
      );
    }

    if (definition.type === 'textarea') {
      return (
        <textarea
          rows={3}
          value={value ?? ''}
          placeholder={definition.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      );
    }

    return (
      <div>
        <input
          type={definition.type === 'number' ? 'number' : 'text'}
          value={value ?? definition.default ?? ''}
          placeholder={definition.placeholder}
          onChange={(e) =>
            onChange(definition.type === 'number' ? Number(e.target.value) : e.target.value)
          }
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {definition.help && (
          <span className="text-[10px] text-gray-400 block mt-1">{definition.help}</span>
        )}
      </div>
    );
  };

  const renderStep = (action, index) => {
    const definition = actionCatalogue[action.actionType];

    return (
      <div key={action.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <button
              type="button"
              onClick={() => moveAction(index, -1)}
              disabled={index === 0}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-[10px]"
            >
              ▲
            </button>
            <span className="text-[10px] font-bold text-gray-400">{index + 1}</span>
            <button
              type="button"
              onClick={() => moveAction(index, 1)}
              disabled={index === draft.actions.length - 1}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-[10px]"
            >
              ▼
            </button>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={action.actionType}
                onChange={(e) =>
                  updateAction(index, { actionType: e.target.value, params: {} })
                }
                className="flex-1 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {(catalogue.actions || []).map((entry) => (
                  <option key={entry.type} value={entry.type}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeAction(index)}
                className="text-gray-300 hover:text-rose-500 p-1"
                title="Remove step"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {definition?.description && (
              <p className="text-[11px] text-gray-500 leading-relaxed">{definition.description}</p>
            )}

            {(definition?.params || []).map((param) => (
              <div key={param.key}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  {param.label}
                  {param.required ? ' *' : ''}
                </label>
                {renderParam(action, param, index)}
              </div>
            ))}

            <div className="pt-2 border-t border-slate-200">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Run this step only when (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={action.condition || ''}
                  placeholder="doc.probability >= 70"
                  onChange={(e) => updateAction(index, { condition: e.target.value })}
                  className="flex-1 px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => handleCheckExpression(action.condition)}
                  className="px-3 py-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                >
                  Check
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Automation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Workflows</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            When something happens, do something. A workflow watches for an event, checks a
            condition, and runs a list of actions. Conditions use a small expression language
            such as <code className="font-mono text-xs">doc.value &gt;= 50000</code>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workflow list */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-slate-50/50">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {workflows.length} workflow{workflows.length === 1 ? '' : 's'}
              </h2>
            </div>

            {loading ? (
              <div className="p-10 text-center text-xs text-gray-400">Loading workflows...</div>
            ) : workflows.length === 0 ? (
              <div className="p-10 text-center">
                <WorkflowIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No workflows yet</p>
                <p className="text-xs text-gray-400 mt-1">Create one to automate a process.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[620px] overflow-y-auto">
                {workflows.map((workflow) => (
                  <div
                    key={workflow._id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                      workflow._id === selectedId ? 'bg-indigo-50/50 border-l-2 border-indigo-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedId(workflow._id);
                      setEditing(false);
                      setDraft(null);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{workflow.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {EVENT_LABELS[workflow.trigger?.event] || workflow.trigger?.event}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(workflow);
                        }}
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          workflow.enabled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title={workflow.enabled ? 'Disable' : 'Enable'}
                      >
                        <Power className="w-3 h-3" />
                        {workflow.enabled ? 'On' : 'Off'}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-medium">
                      <span>{workflow.actions?.length || 0} steps</span>
                      <span>·</span>
                      <span>{workflow.runCount || 0} runs</span>
                      {workflow.lastRunAt && (
                        <>
                          <span>·</span>
                          <span>{new Date(workflow.lastRunAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor / detail */}
        <div className="lg:col-span-8">
          {editing && draft ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">
                  {selectedId ? 'Edit workflow' : 'New workflow'}
                </h2>
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Follow up on a stalled deal"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="What does this automate?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  When this happens
                </label>
                <select
                  value={draft.trigger.event}
                  onChange={(e) =>
                    setDraft({ ...draft, trigger: { ...draft.trigger, event: e.target.value } })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {(catalogue.events || []).map((event) => (
                    <option key={event} value={event}>
                      {EVENT_LABELS[event] || event}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Only when these fields match
                </label>
                <div className="space-y-2">
                  {(draft.trigger.filters || []).map((filter, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={filter.field}
                        placeholder="value"
                        onChange={(e) => {
                          const filters = [...draft.trigger.filters];
                          filters[index] = { ...filter, field: e.target.value };
                          setDraft({ ...draft, trigger: { ...draft.trigger, filters } });
                        }}
                        className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                      <select
                        value={filter.operator}
                        onChange={(e) => {
                          const filters = [...draft.trigger.filters];
                          filters[index] = { ...filter, operator: e.target.value };
                          setDraft({ ...draft, trigger: { ...draft.trigger, filters } });
                        }}
                        className="w-40 px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white"
                      >
                        {FILTER_OPERATORS.map((operator) => (
                          <option key={operator.value} value={operator.value}>
                            {operator.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={filter.value ?? ''}
                        placeholder="expected"
                        onChange={(e) => {
                          const filters = [...draft.trigger.filters];
                          filters[index] = { ...filter, value: e.target.value };
                          setDraft({ ...draft, trigger: { ...draft.trigger, filters } });
                        }}
                        className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            trigger: {
                              ...draft.trigger,
                              filters: draft.trigger.filters.filter((_, i) => i !== index),
                            },
                          })
                        }
                        className="text-gray-300 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        trigger: {
                          ...draft.trigger,
                          filters: [
                            ...(draft.trigger.filters || []),
                            { field: '', operator: 'equals', value: '' },
                          ],
                        },
                      })
                    }
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    + Add a filter
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  And only if
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.conditions}
                    placeholder="doc.value >= 50000 && doc.stage == 'negotiation'"
                    onChange={(e) => setDraft({ ...draft, conditions: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleCheckExpression(draft.conditions)}
                    className="px-3 py-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg shrink-0"
                  >
                    Check
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Use <code className="font-mono">doc.field</code> for the record,{' '}
                  <code className="font-mono">previous.field</code> for its prior value, and{' '}
                  <code className="font-mono">actor.name</code> for who triggered it.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Then do
                </label>
                <div className="space-y-3">
                  {(draft.actions || []).map((action, index) => renderStep(action, index))}
                </div>
                <button
                  type="button"
                  onClick={addAction}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add a step
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save workflow'}
                </button>
              </div>
            </div>
          ) : selected ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  {selected.description && (
                    <p className="text-xs text-gray-500 mt-1">{selected.description}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2">
                    Trigger: {EVENT_LABELS[selected.trigger?.event] || selected.trigger?.event}
                    {selected.trigger?.filters?.length > 0 &&
                      ` · ${selected.trigger.filters.length} filter(s)`}
                    {selected.conditions && ` · condition: ${selected.conditions}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(selected)}
                    className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRunNow(selected)}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                    title="Run this workflow against the most recent matching record"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run now
                  </button>
                  <button
                    onClick={() => handleToggle(selected)}
                    className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    {selected.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(selected)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Steps
                </h3>
                <div className="space-y-2">
                  {(selected.actions || []).map((action, index) => (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-gray-200"
                    >
                      <span className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-[10px] font-bold text-gray-500 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900">
                          {actionCatalogue[action.actionType]?.label || action.actionType}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {Object.entries(action.params || {})
                            .filter(([, value]) => value !== '' && value !== undefined)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' · ') || 'No parameters'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <WorkflowIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">
                Select a workflow, or create a new one
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Workflows watch for an event, check a condition, and run a list of actions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Run log */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-gray-400" />
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent runs</h2>
        </div>

        {runs.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400">
            No workflow has run yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Workflow', 'Event', 'Record', 'Status', 'Steps', 'When'].map((heading) => (
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
                {runs.map((run) => {
                  const meta = RUN_STATUS_META[run.status] || RUN_STATUS_META.running;
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={run._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                        {run.workflowName}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {EVENT_LABELS[run.event] || run.event}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {run.entity} · {String(run.entityId).slice(-6)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${meta.chip}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {(run.steps || [])
                          .map((step) => `${step.actionType}:${step.status}`)
                          .join(', ') || '—'}
                        {run.error && (
                          <span className="block text-[11px] text-rose-600 mt-0.5">{run.error}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {run.createdAt ? new Date(run.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflows;
