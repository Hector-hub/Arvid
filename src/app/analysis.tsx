import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { analyze, progressFromCents, type Analysis } from '../domain/progress/progress';
import { testsXp } from '../domain/origen/programTests';
import { useToday } from './clock';
import { useMissions, useRecords, useSettings } from './data';

const AnalysisCtx = createContext<Analysis | undefined>(undefined);

/** Calcula una sola vez por cambio de datos o de día el progreso y las rachas (NFR2-01) y lo comparte. */
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const records = useRecords();
  const missions = useMissions();
  const today = useToday();
  // Las pruebas del programa superadas suman XP al nivel (spec 17, PR-08)
  const extra = testsXp(useSettings()?.origen?.tests);
  const analysis = useMemo(() => {
    if (!records || !missions) return undefined;
    const a = analyze(records, today, missions);
    return extra ? { ...a, progress: progressFromCents(a.progress.xpCents + extra * 100) } : a;
  }, [records, missions, today, extra]);
  return <AnalysisCtx.Provider value={analysis}>{children}</AnalysisCtx.Provider>;
}

export function useAnalysis(): Analysis | undefined {
  return useContext(AnalysisCtx);
}
