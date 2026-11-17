import { useEffect, useState } from 'react';

const NAMES = ['accent', 'open', 'merged', 'closed', 'info', 'muted', 'line', 'ink', 'faint', 'surface'] as const;
export type ChartColors = Record<(typeof NAMES)[number], string>;

function read(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  const out = {} as ChartColors;
  for (const n of NAMES) out[n] = `rgb(${style.getPropertyValue(`--${n}`).trim().replace(/\s+/g, ' ')})`;
  return out;
}

/**
 * Recharts needs concrete colors, not CSS variables. Read the live tokens and
 * re-read when the theme attribute or the OS color scheme changes.
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(read);
  useEffect(() => {
    const update = () => setColors(read());
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    return () => {
      mo.disconnect();
      mq.removeEventListener('change', update);
    };
  }, []);
  return colors;
}
