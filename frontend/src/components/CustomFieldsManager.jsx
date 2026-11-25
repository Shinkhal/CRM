import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import { Plus, Trash2, X, Sliders, Hash, Type, ListFilter, Calendar, Sparkles } from 'lucide-react';
import { listOf } from '../api/collections';

const CustomFieldsManager = ({ isOpen, onClose }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    entity: 'deal',
    label: '',
    type: 'text',
    optionsString: '',
    required: false,
  });

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/business/custom-fields');
      setFields(listOf(res.data, 'customFields'));
    } catch (err) {
      console.error('Failed to load custom fields:', err);
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFields();
    }
  }, [isOpen, fetchFields]);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.label.trim()) {
      return toast.warning('Please enter a field label');
    }

    setSubmitting(true);
    try {
      const options =
        formData.type === 'select'
          ? formData.optionsString
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      const res = await axios.post('/business/custom-fields', {
        entity: formData.entity,
        label: formData.label.trim(),
        type: formData.type,
        options,
        required: formData.required,
      });

      setFields(listOf(res.data, 'customFields'));
      toast.success('Custom field registered!');
      setIsAdding(false);
      setFormData({
        entity: 'deal',
        label: '',
        type: 'text',
        optionsString: '',
        required: false,
      });
    } catch (err) {
      console.error('Failed to add custom field:', err);
      toast.error(err.response?.data?.message || 'Failed to add custom field');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this custom field definition?')) return;
    try {
      const res = await axios.delete(`/business/custom-fields/${id}`);
      setFields(listOf(res.data, 'customFields'));
      toast.success('Custom field deleted');
    } catch (err) {
      console.error('Failed to remove custom field:', err);
      toast.error('Failed to remove custom field');
    }
  };

  const filteredFields = fields.filter((f) =>
    entityFilter === 'all' ? true : f.entity === entityFilter
  );

  const getTypeIcon = (t) => {
    switch (t) {
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-emerald-500" />;
      case 'select':
        return <ListFilter className="w-3.5 h-3.5 text-purple-500" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
      case 'text':
      default:
        return <Type className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sliders className="w-5 h-5 text-white" />
            </span>
            <div>
              <h3 className="font-bold text-lg leading-tight">Custom Field Customizer</h3>
              <p className="text-blue-100 text-xs">
                Tailor your CRM records by defining custom data points on Deals, Customers, or Accounts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-100 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter entity:</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm text-xs font-medium">
              {['all', 'deal', 'customer', 'organization'].map((ent) => (
                <button
                  key={ent}
                  onClick={() => setEntityFilter(ent)}
                  className={`px-3 py-1 rounded-md capitalize transition-all ${
                    entityFilter === ent
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ent === 'all' ? 'All Entities' : `${ent}s`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Close Creator' : 'New Field'}</span>
          </button>
        </div>

        {/* Inline Field Creator */}
        {isAdding && (
          <form
            onSubmit={handleCreate}
            className="p-5 bg-blue-50/50 border-b border-blue-100 space-y-3 shrink-0"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Target Entity *
                </label>
                <select
                  value={formData.entity}
                  onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="deal">Deals</option>
                  <option value="customer">Customers</option>
                  <option value="organization">Organizations</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Field Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Source"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Field Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Dropdown Select</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>

            {formData.type === 'select' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Dropdown Options (comma separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Website, Referral, LinkedIn, Cold Call, Event"
                  value={formData.optionsString}
                  onChange={(e) => setFormData({ ...formData, optionsString: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Mandatory / Required Field</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Save Field'}
              </button>
            </div>
          </form>
        )}

        {/* Custom Fields List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-center py-10 text-xs text-slate-400">Loading custom fields...</p>
          ) : filteredFields.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No custom fields defined</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Customize your sales workflows by adding specialized fields for region, lead sources, contract values, or industry attributes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFields.map((field) => (
                <div
                  key={field.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="p-2 bg-slate-100 rounded-lg mt-0.5">
                      {getTypeIcon(field.type)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{field.label}</span>
                        {field.required && (
                          <span className="text-[9px] uppercase font-extrabold bg-rose-50 text-rose-600 px-1.5 py-0.2 rounded border border-rose-200">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                          {field.entity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          key: {field.key}
                        </span>
                      </div>
                      {field.type === 'select' && field.options?.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Options: {field.options.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(field.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomFieldsManager;
