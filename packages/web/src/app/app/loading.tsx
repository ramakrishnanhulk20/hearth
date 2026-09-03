export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-ink">
      <svg width="54" height="54" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M4 21V9.5A5.5 5.5 0 0 1 9.5 4h5A5.5 5.5 0 0 1 20 9.5V21"
          fill="none"
          stroke="rgb(var(--flame) / 0.6)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path d="M2.6 21h18.8" stroke="rgb(var(--flame) / 0.6)" strokeWidth="1.4" strokeLinecap="round" />
        <path
          className="flame-core"
          d="M12 10.2c1.9 1.3 2.8 2.6 2.8 4a2.8 2.8 0 0 1-5.6 0c0-1.4.9-2.7 2.8-4z"
          fill="rgb(var(--flame))"
        />
      </svg>
      <p className="text-[13px] tracking-wide text-faint">Lighting the hearth</p>
    </div>
  );
}
