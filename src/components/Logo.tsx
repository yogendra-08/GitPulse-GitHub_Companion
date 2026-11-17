/** GitPulse mark: a heartbeat line over a rounded square. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="rgb(var(--accent))" />
      <path
        d="M4.5 17.5h5.2l2.8-7.5 4.4 13 3.1-9.5 1.8 4h5.7"
        fill="none"
        stroke="rgb(var(--accent-ink))"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
