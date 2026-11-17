import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings, type Settings } from '@/shared/settings';
import { KEYS, onStorageChange } from '@/shared/storage';
import { useApplyTheme } from '@/hooks/useTheme';

interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
  togglePinned: (fullName: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(settings);
  latest.current = settings;

  useEffect(() => {
    void loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
    return onStorageChange((changes) => {
      if (KEYS.settings in changes) setSettings(normalizeSettings(changes[KEYS.settings]?.newValue as Partial<Settings>));
    });
  }, []);

  useApplyTheme(settings.theme);

  const update = useCallback((patch: Partial<Settings>) => {
    const next = normalizeSettings({ ...latest.current, ...patch });
    latest.current = next;
    setSettings(next);
    void saveSettings(next);
  }, []);

  const togglePinned = useCallback(
    (fullName: string) => {
      const pinned = latest.current.pinned;
      update({ pinned: pinned.includes(fullName) ? pinned.filter((p) => p !== fullName) : [...pinned, fullName] });
    },
    [update],
  );

  const value = useMemo(() => ({ settings, loaded, update, togglePinned }), [settings, loaded, update, togglePinned]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
