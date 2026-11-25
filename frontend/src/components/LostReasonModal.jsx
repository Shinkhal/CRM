import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';

const COMMON_REASONS = [
  'Price / Budget Constraints',
  'Competitor Won',
  'Missing Critical Features',
  'Project Postponed / Timing',
  'Client Unresponsive / Ghosted',
  'Change in Management / Decision Maker',
  'Other',
];

const LostReasonModal = ({ isOpen, onClose, onConfirm, dealTitle }) => {
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const finalReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason;
      await onConfirm({ lostReason: finalReason, lostNotes: notes.trim() });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <AlertTriangle className="w-5 h-5 text-white" />
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">Mark Deal as Lost</h3>
              <p className="text-rose-100 text-xs truncate max-w-[280px]">
                {dealTitle || 'Capture loss intelligence'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Primary Reason for Loss *
            </label>
            <div className="relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all cursor-pointer"
              >
                {COMMON_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {reason === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Specify Reason *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Company acquired by foreign conglomerate"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Feedback & Insights (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="What could we have done differently? Competitor product, quotes, or client quotes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Updating...' : 'Confirm Lost'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LostReasonModal;
