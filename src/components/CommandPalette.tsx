import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon?: ReactNode;
  keywords?: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  /** Extra command built from what the user typed (e.g. "Search GitHub for …"). */
  fromQuery?: (query: string) => Command | null;
}

const MAX_RESULTS = 9;

export function CommandPalette({ open, onClose, commands, fromQuery }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const listId = useId();

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matched = tokens.length
      ? commands.filter((c) => {
          const hay = `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase();
          return tokens.every((t) => hay.includes(t));
        })
      : commands.filter((c) => c.group !== 'Repositories');
    const extra = query.trim() ? fromQuery?.(query.trim()) : null;
    return [...matched.slice(0, MAX_RESULTS), ...(extra ? [extra] : [])];
  }, [query, commands, fromQuery]);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      returnFocus.current?.focus?.();
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[14vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-xl bg-surface shadow-pop"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search aria-hidden size={15} className="text-faint" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-label="Search pages, repositories and actions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, repositories and actions"
            className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
          />
          <kbd className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-faint">esc</kbd>
        </div>
        <ul id={listId} role="listbox" className="max-h-[360px] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No matches</li>}
          {results.map((c, i) => {
            const showGroup = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <li key={c.id} role="presentation">
                {showGroup && <div className="px-2.5 pb-1 pt-2 text-xs text-faint">{c.group}</div>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(c)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${i === active ? 'bg-raised text-ink' : 'text-muted'}`}
                >
                  <span className="text-faint">{c.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="font-mono text-xs text-faint">{c.hint}</span>}
                  {i === active && <CornerDownLeft aria-hidden size={13} className="text-faint" />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
