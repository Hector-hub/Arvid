import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, type ReactNode } from 'react';
import { loadMissions } from '../data/missions';
import { loadGoals } from '../data/goals';
import { loadMemories } from '../data/memory';
import { loadAchievements, loadCategories, loadRecord, loadRecords, loadRests, loadSettings, type DataContext } from '../data/repository';

const DataCtx = createContext<DataContext | null>(null);

export function DataProvider({ value, children }: { value: DataContext; children: ReactNode }) {
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData(): DataContext {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error('useData requiere DataProvider');
  return ctx;
}

/** Lecturas reactivas: se actualizan solas al escribir (LOG-05) e incluso entre pestañas. */
export function useRecords() {
  const { db } = useData();
  return useLiveQuery(() => loadRecords(db), [db]);
}

export function useRecord(id: string | undefined) {
  const { db } = useData();
  return useLiveQuery(() => (id ? loadRecord(db, id) : undefined), [db, id], null);
}

export function useCategories() {
  const { db } = useData();
  return useLiveQuery(() => loadCategories(db), [db]);
}

export function useSettings() {
  const { db } = useData();
  return useLiveQuery(() => loadSettings(db), [db]);
}

export function useMissions() {
  const { db } = useData();
  return useLiveQuery(() => loadMissions(db), [db]);
}

/** Logros desbloqueados (spec 07). */
export function useAchievements() {
  const { db } = useData();
  return useLiveQuery(() => loadAchievements(db), [db]);
}

/** Descansos planificados (spec 12, DS). */
export function useRests() {
  const { db } = useData();
  return useLiveQuery(() => loadRests(db), [db]);
}

/** Objetivos con hitos (spec 12, OB). */
export function useGoals() {
  const { db } = useData();
  return useLiveQuery(() => loadGoals(db), [db]);
}

/** Memoria del compañero (spec 13). */
/** Retos entre amigos, copia local (spec 15). */
export function useChallenges() {
  const { db } = useData();
  return useLiveQuery(() => db.challenges.toArray(), [db]);
}

export function useMemories() {
  const { db } = useData();
  return useLiveQuery(() => loadMemories(db), [db]);
}
