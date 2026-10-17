import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { analyze, type Analysis } from '../domain/progress/progress';
import { useToday } from './clock';
import { useMissions, useRecords } from './data';

const AnalysisCtx = createContext<Analysis | undefined>(undefined);

/** Calcula una sola vez por cambio de datos o de día el progreso y las rachas (NFR2-01) y lo comparte. */
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const records = useRecords();
  const missions = useMissions();
  const today = useToday();
  const analysis = useMemo(
    () => (records && missions ? analyze(records, today, missions) : undefined),
    [records, missions, today],
  );
  return <AnalysisCtx.Provider value={analysis}>{children}</AnalysisCtx.Provider>;
}

export function useAnalysis(): Analysis | undefined {
  return useContext(AnalysisCtx);
}
