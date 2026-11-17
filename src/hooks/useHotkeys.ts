import { useEffect, useRef } from 'react';

export interface HotkeyHandlers {
  openPalette: () => void;
  go: (key: string) => void;
  refresh: () => void;
  toggleTheme: () => void;
}

const isTyping = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/**
 * Global shortcuts: Cmd/Ctrl+K, "/" to focus search, "g" then a letter to jump
 * between pages, "r" to refresh, "t" to cycle the theme. Ignored while typing.
 */
export function useHotkeys(h: HotkeyHandlers): void {
  const handlers = useRef(h);
  handlers.current = h;

  useEffect(() => {
    let chord = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlers.current.openPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;

      if (chord) {
        chord = false;
        clearTimeout(timer);
        handlers.current.go(e.key.toLowerCase());
        return;
      }
      switch (e.key) {
        case 'g':
          chord = true;
          timer = setTimeout(() => (chord = false), 1200);
          break;
        case '/': {
          const el = document.querySelector<HTMLInputElement>('input[data-search]');
          if (el) {
            e.preventDefault();
            el.focus();
          }
          break;
        }
        case 'r':
          handlers.current.refresh();
          break;
        case 't':
          handlers.current.toggleTheme();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, []);
}
