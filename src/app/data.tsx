import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, type ReactNode } from 'react';
import { loadMissions } from '../data/missions';
import { loadCategories, loadRecord, loadRecords, loadSettings, type DataContext } from '../data/repository';

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
