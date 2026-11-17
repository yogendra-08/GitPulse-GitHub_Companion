import { useEffect } from 'react';
import type { ThemePreference } from '@/shared/settings';

/** Apply the theme to <html>. "system" removes the attribute so CSS follows the OS. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function useApplyTheme(theme: ThemePreference): void {
  useEffect(() => applyTheme(theme), [theme]);
}

export function nextTheme(current: ThemePreference): ThemePreference {
  return current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
}
