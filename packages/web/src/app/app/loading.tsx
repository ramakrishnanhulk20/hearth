export default function Loading() {
  return (
    <div className="force-dark fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-ink">
      <svg width="46" height="60" viewBox="0 0 14 18" aria-hidden className="overflow-visible">
        <path d="M4.6 3.6a2.4 2 0 0 1 4.8 0" fill="none" stroke="rgb(var(--flame))" strokeOpacity="0.7" strokeWidth="1" />
        <rect
          x="2.4"
          y="3.4"
          width="9.2"
          height="12"
          rx="2.2"
          fill="rgb(var(--flame) / 0.1)"
          stroke="rgb(var(--flame))"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <circle className="lantern-flame" cx="7" cy="10" r="2.7" fill="#ffd84d" />
      </svg>
      <p className="text-[13px] tracking-wide text-faint">Lighting your lantern…</p>
    </div>
  );
}
