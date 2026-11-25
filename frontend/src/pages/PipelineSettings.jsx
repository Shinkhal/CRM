import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axios from '../api/axios';
import { listOf } from '../api/collections';
import { Settings2, Plus, Trash2, Save, Star, GripVertical } from 'lucide-react';

const COLORS = ['slate', 'blue', 'purple', 'amber', 'indigo', 'emerald', 'rose'];

const emptyStage = (position) => ({
  key: '',
  label: '',
  color: 'slate',
  probability: 10,
  type: 'open',
  position,
});

/**
 * Pipeline configuration. The stage list is tenant data rather than code, so
 * a team can rename stages, reorder them, and set the win probability that
 * drives the weighted forecast.
 */
const PipelineSettings = () => {
  const [pipelines, setPipelines] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/pipelines');
      const list = listOf(res.data, 'pipelines');
      setPipelines(list);
      setSelectedId((prev) => prev || list.find((p) => p.isDefault)?._id || list[0]?._id || null);
    } catch (err) {
      console.error('Failed to load pipelines:', err);
      toast.error('Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  useEffect(() => {
    const selected = pipelines.find((p) => p._id === selectedId);
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft({
      _id: selected._id,
      name: selected.name,
      description: selected.description || '',
      isDefault: Boolean(selected.isDefault),
      stages: [...(selected.stages || [])]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((stage) => ({ ...stage })),
    });
  }, [pipelines, selectedId]);

  const updateStage = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage, i) => (i === index ? { ...stage, ...patch } : stage)),
    }));
  };

  const addStage = () => {
    setDraft((prev) => ({
      ...prev,
      stages: [...prev.stages, emptyStage(prev.stages.length)],
    }));
  };

  const removeStage = (index) => {
    setDraft((prev) => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index),
    }));
  };

  const moveStage = (index, direction) => {
    setDraft((prev) => {
      const next = [...prev.stages];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, stages: next };
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    const invalid = draft.stages.find((stage) => !stage.label.trim());
    if (invalid) {
      toast.error('Every stage needs a label');
      return;
    }
    if (draft.stages.filter((s) => s.type === 'won').length !== 1) {
      toast.error('Exactly one stage must be marked as won');
      return;
    }
    if (draft.stages.filter((s) => s.type === 'lost').length !== 1) {
      toast.error('Exactly one stage must be marked as lost');
      return;
    }

    setSaving(true);
    try {
      await axios.put(`/pipelines/${draft._id}`, {
        name: draft.name,
        description: draft.description,
        stages: draft.stages,
      });
      toast.success('Pipeline updated');
      fetchPipelines();
    } catch (err) {
      console.error('Failed to update pipeline:', err);
      toast.error(err.response?.data?.message || 'Failed to update pipeline');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.warning('Enter a pipeline name');
      return;
    }
    setCreating(true);
    try {
      const res = await axios.post('/pipelines', { name: newName.trim() });
      toast.success('Pipeline created');
      setNewName('');
      setSelectedId(res.data?.pipeline?._id || null);
      fetchPipelines();
    } catch (err) {
      console.error('Failed to create pipeline:', err);
      toast.error(err.response?.data?.message || 'Failed to create pipeline');
    } finally {
      setCreating(false);
    }
  };

  const handleSetDefault = async () => {
    if (!draft) return;
    try {
      await axios.post(`/pipelines/${draft._id}/default`);
      toast.success('Default pipeline updated');
      fetchPipelines();
    } catch (err) {
      console.error('Failed to set default pipeline:', err);
      toast.error('Failed to set the default pipeline');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
          <Settings2 className="w-3.5 h-3.5" />
          <span>Pipeline Configuration</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Pipelines &amp; Stages
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Stages are data, not code. The probability of a stage is the weight used in the weighted
          forecast, and the won / lost stage marks decide which deals count as closed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pipelines</h2>
            <div className="space-y-1.5">
              {pipelines.map((pipeline) => (
                <button
                  key={pipeline._id}
                  onClick={() => setSelectedId(pipeline._id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    pipeline._id === selectedId
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 text-gray-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="truncate">{pipeline.name}</span>
                    {pipeline.isDefault && <Star className="w-3 h-3 shrink-0" />}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                New pipeline
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Renewal Pipeline"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                onClick={handleCreate}
                disabled={creating}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Create pipeline
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {draft ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex-1">
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {draft.isDefault && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] uppercase font-bold text-amber-600">
                      <Star className="w-3 h-3" /> Default pipeline
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!draft.isDefault && (
                    <button
                      onClick={handleSetDefault}
                      className="px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save pipeline'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {draft.stages.map((stage, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="sm:col-span-1 flex flex-col items-center gap-0.5">
                      <button
                        onClick={() => moveStage(index, -1)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                      <button
                        onClick={() => moveStage(index, 1)}
                        disabled={index === draft.stages.length - 1}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={stage.label}
                        placeholder="Stage name"
                        onChange={(e) => updateStage(index, { label: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <select
                        value={stage.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          updateStage(index, {
                            type,
                            probability:
                              type === 'won' ? 100 : type === 'lost' ? 0 : stage.probability,
                          });
                        }}
                        className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="open">Open stage</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <select
                        value={stage.color}
                        onChange={(e) => updateStage(index, { color: e.target.value })}
                        className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        {COLORS.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-0.5">
                        Win probability
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={stage.probability}
                          disabled={stage.type !== 'open'}
                          onChange={(e) =>
                            updateStage(index, { probability: Number(e.target.value) })
                          }
                          className="flex-1 accent-blue-600 disabled:opacity-40"
                        />
                        <span className="text-xs font-bold text-gray-700 w-8 text-right">
                          {stage.probability}%
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        onClick={() => removeStage(index)}
                        className="text-gray-300 hover:text-rose-500 transition-colors p-1"
                        title="Remove stage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addStage}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Add stage
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <Settings2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No pipeline selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineSettings;
