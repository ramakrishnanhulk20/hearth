/**
 * The console icon set. Hand drawn on a 24 unit grid at a single stroke weight, because a
 * downloaded pack would need a licence line in the footer and would not match the mark.
 */

type IconProps = { size?: number };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Frame({ size = 18, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      {children}
    </svg>
  );
}

export function DashboardIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" {...stroke} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" {...stroke} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" {...stroke} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" {...stroke} />
    </Frame>
  );
}

export function DepositIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M12 3.5v10" {...stroke} />
      <path d="M8 9.8l4 4 4-4" {...stroke} />
      <path d="M4 15.5v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" {...stroke} />
    </Frame>
  );
}

export function WithdrawIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M12 14V4" {...stroke} />
      <path d="M8 7.7l4-4 4 4" {...stroke} />
      <path d="M4 15.5v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" {...stroke} />
    </Frame>
  );
}

export function DrawsIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path
        d="M4 8.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 1.9 1.9 0 0 0 0 3.8 1.9 1.9 0 0 0 0 3.8 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 1.9 1.9 0 0 0 0-3.8 1.9 1.9 0 0 0 0-3.8z"
        {...stroke}
      />
      <path d="M13.2 9.2v1.6M13.2 13.2v1.6" {...stroke} />
    </Frame>
  );
}

export function RunIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M13.4 3.5 5.5 13.4h5.3l-.9 7.1 8-9.9h-5.4z" {...stroke} />
    </Frame>
  );
}

export function DocsIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M6 4h8.5L19 8.5V20H6z" {...stroke} />
      <path d="M14 4v5h5" {...stroke} />
      <path d="M9 13h7M9 16.5h4.5" {...stroke} />
    </Frame>
  );
}

export function VerifyIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M12 3.4 5 6.2v5.4c0 4 2.8 7.6 7 9 4.2-1.4 7-5 7-9V6.2z" {...stroke} />
      <path d="m9 11.8 2.2 2.2 4-4.2" {...stroke} />
    </Frame>
  );
}

export function ChainIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M10.2 13.8a3.4 3.4 0 0 0 5 .3l2.3-2.3a3.4 3.4 0 0 0-4.8-4.8l-1.3 1.3" {...stroke} />
      <path d="M13.8 10.2a3.4 3.4 0 0 0-5-.3l-2.3 2.3a3.4 3.4 0 0 0 4.8 4.8l1.3-1.3" {...stroke} />
    </Frame>
  );
}

export function EyeIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12z" {...stroke} />
      <circle cx="12" cy="12" r="2.9" {...stroke} />
    </Frame>
  );
}

export function EyeOffIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M4 4.6 20 19.4" {...stroke} />
      <path d="M9.6 6.2A9 9 0 0 1 12 5.8c5.6 0 9.2 6.2 9.2 6.2a17 17 0 0 1-3 3.7" {...stroke} />
      <path d="M6.5 8.4A17 17 0 0 0 2.8 12S6.4 18.2 12 18.2a9 9 0 0 0 3.2-.6" {...stroke} />
      <path d="M10 10.2a2.9 2.9 0 0 0 4 4.1" {...stroke} />
    </Frame>
  );
}

export function MenuIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M4 7h16M4 12h16M4 17h11" {...stroke} />
    </Frame>
  );
}

export function CloseIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M6 6l12 12M18 6 6 18" {...stroke} />
    </Frame>
  );
}

export function CheckIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="m5.5 12.4 4.2 4.2 8.8-9.2" {...stroke} />
    </Frame>
  );
}

export function ChevronIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="m7.5 10 4.5 4.5 4.5-4.5" {...stroke} />
    </Frame>
  );
}

export function MoreIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <circle cx="12" cy="5.6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18.4" r="1.5" fill="currentColor" />
    </Frame>
  );
}

export function GlobeIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <circle cx="12" cy="12" r="8.4" {...stroke} />
      <path d="M3.7 9.4h16.6M3.7 14.6h16.6" {...stroke} />
      <path d="M12 3.6c2 2.3 3.1 5.2 3.1 8.4s-1.1 6.1-3.1 8.4c-2-2.3-3.1-5.2-3.1-8.4S10 5.9 12 3.6z" {...stroke} />
    </Frame>
  );
}

export function CoinIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <circle cx="12" cy="12" r="8.4" {...stroke} />
      <path d="M14.4 9.3a2.7 2.7 0 0 0-2.4-1.2c-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.3 5 3.9 0 1.1-1 2-2.5 2a2.7 2.7 0 0 1-2.5-1.3" {...stroke} />
      <path d="M12 6.6v10.8" {...stroke} />
    </Frame>
  );
}
