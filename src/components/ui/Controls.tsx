import { useId, type ChangeEvent, type ReactNode, type RefObject } from 'react';
import { Search } from 'lucide-react';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  label: string;
  size?: 'sm' | 'md';
}

/** A tab-style single-choice control (radio group semantics). */
export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-surface p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 transition-colors ${size === 'sm' ? 'h-6 text-xs' : 'h-7 text-sm'} ${
              active ? 'bg-raised text-ink shadow-[inset_0_0_0_1px_rgb(var(--line-strong))]' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className="num text-xs text-faint">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputRef?: RefObject<HTMLInputElement>;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, inputRef, className = '' }: SearchInputProps) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <Search aria-hidden size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        data-search
        type="search"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-line-strong bg-surface pl-8 pr-2.5 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
      />
    </label>
  );
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}

export function Select<T extends string>({ value, onChange, options, label }: SelectProps<T>) {
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink focus:border-accent focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

/** A labelled switch row. */
export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-6 py-2.5">
      <div className="min-w-0">
        <div id={id} className="text-sm text-ink">
          {label}
        </div>
        {description && <div className="text-xs text-muted">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? 'border-accent bg-accent' : 'border-line-strong bg-raised'}`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${checked ? 'left-[18px] bg-accent-ink' : 'left-0.5 bg-muted'}`}
        />
      </button>
    </div>
  );
}
