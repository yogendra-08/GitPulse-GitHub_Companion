export function Avatar({ src, name, size = 20 }: { src?: string | null; name: string; size?: number }) {
  if (!src) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-raised text-[10px] font-medium uppercase text-muted"
      >
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={`${src}${src.includes('?') ? '&' : '?'}s=${size * 2}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 rounded-full bg-raised"
    />
  );
}
