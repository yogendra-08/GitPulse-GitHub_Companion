import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface DataContextValue {
  /** Increments every time the user asks for a full refresh. */
  refreshCount: number;
  refreshAll: () => void;
}

const DataContext = createContext<DataContextValue>({ refreshCount: 0, refreshAll: () => undefined });

export function DataProvider({ children }: { children: ReactNode }) {
  const [refreshCount, setRefreshCount] = useState(0);
  const refreshAll = useCallback(() => setRefreshCount((n) => n + 1), []);
  const value = useMemo(() => ({ refreshCount, refreshAll }), [refreshCount, refreshAll]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = (): DataContextValue => useContext(DataContext);
