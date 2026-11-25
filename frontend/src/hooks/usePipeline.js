import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import {
  HelpCircle,
  Phone,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/**
 * Stage presentation metadata. The stage *list* comes from the API (the
 * tenant's pipeline), only the colour and icon treatment is defined here.
 */
export const STAGE_THEME = {
  blue: {
    icon: Phone,
    border: 'border-blue-300 bg-blue-50/50',
    header: 'bg-blue-100 text-blue-800',
    chip: 'bg-blue-100 text-blue-800',
  },
  purple: {
    icon: Layers,
    border: 'border-purple-300 bg-purple-50/50',
    header: 'bg-purple-100 text-purple-800',
    chip: 'bg-purple-100 text-purple-800',
  },
  amber: {
    icon: Clock,
    border: 'border-amber-300 bg-amber-50/50',
    header: 'bg-amber-100 text-amber-800',
    chip: 'bg-amber-100 text-amber-800',
  },
  indigo: {
    icon: Phone,
    border: 'border-indigo-300 bg-indigo-50/50',
    header: 'bg-indigo-100 text-indigo-800',
    chip: 'bg-indigo-100 text-indigo-800',
  },
  emerald: {
    icon: CheckCircle2,
    border: 'border-emerald-300 bg-emerald-50/50',
    header: 'bg-emerald-100 text-emerald-800',
    chip: 'bg-emerald-100 text-emerald-800',
  },
  rose: {
    icon: XCircle,
    border: 'border-rose-300 bg-rose-50/50',
    header: 'bg-rose-100 text-rose-800',
    chip: 'bg-rose-100 text-rose-800',
  },
  slate: {
    icon: HelpCircle,
    border: 'border-slate-300 bg-slate-50',
    header: 'bg-slate-100 text-slate-800',
    chip: 'bg-slate-100 text-slate-800',
  },
};

/** Fallback used only while the API is unreachable, so the board still renders. */
export const FALLBACK_STAGES = [
  { key: 'lead', label: 'Lead In', color: 'slate', probability: 10, type: 'open', position: 0 },
  { key: 'contacted', label: 'Contacted', color: 'blue', probability: 25, type: 'open', position: 1 },
  { key: 'proposal', label: 'Proposal Sent', color: 'purple', probability: 50, type: 'open', position: 2 },
  { key: 'negotiation', label: 'Negotiation', color: 'amber', probability: 70, type: 'open', position: 3 },
  { key: 'won', label: 'Closed Won', color: 'emerald', probability: 100, type: 'won', position: 4 },
  { key: 'lost', label: 'Closed Lost', color: 'rose', probability: 0, type: 'lost', position: 5 },
];

const withTheme = (stage) => ({
  ...stage,
  theme: STAGE_THEME[stage.color] || STAGE_THEME.slate,
});

/**
 * Loads the tenant's pipeline so every screen renders the same stages from
 * one source of truth. Previously the stage list was hardcoded in three
 * separate frontend files and once more in the backend.
 */
export const usePipeline = () => {
  const [stages, setStages] = useState(() => FALLBACK_STAGES.map(withTheme));
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/pipelines/default');
      const data = res.data || {};
      const nextStages = Array.isArray(data.stages) ? data.stages : [];
      if (nextStages.length > 0) {
        setStages(
          [...nextStages]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map(withTheme)
        );
        setPipeline(data);
      }
    } catch {
      // Keep the fallback stages: a pipeline configuration failure must not
      // make the board unusable.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stageMap = useMemo(() => {
    const map = {};
    for (const stage of stages) map[stage.key] = stage;
    return map;
  }, [stages]);

  const stageLabel = useCallback(
    (key) => stageMap[key]?.label || key,
    [stageMap]
  );

  const stageType = useCallback(
    (key) => stageMap[key]?.type || 'open',
    [stageMap]
  );

  const lostStageKey = useMemo(
    () => stages.find((stage) => stage.type === 'lost')?.key || 'lost',
    [stages]
  );

  const wonStageKey = useMemo(
    () => stages.find((stage) => stage.type === 'won')?.key || 'won',
    [stages]
  );

  return {
    stages,
    stageMap,
    stageLabel,
    stageType,
    lostStageKey,
    wonStageKey,
    pipeline,
    loading,
    refresh: load,
  };
};

export default usePipeline;
