"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { useActions } from "@/hooks/useActions";
import { useActionScene, usePeekScene } from "@/hooks/useSceneReactions";
import type { LanternReads } from "@/hooks/useLantern";
import { useReveal } from "@/hooks/useReveal";
import { useReady } from "./ConnectBar";
import { useMessages } from "@/i18n/LocaleProvider";
import { ADDRESSES } from "@/lib/chain/contracts";
import { formatAmount, formatWhole, parseAmount } from "@/lib/format";
import { LanternSpinner, PhaseNote } from "./ui";

const FAUCET = 10_000_000_000n;

function Btn({
  children,
  onClick,
  disabled = false,
  busy = false,
  tone = "ghost",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: "primary" | "ghost";
  className?: string;
}) {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-200 active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
  const skin =
    tone === "primary"
      ? "bg-flameFill text-onFlame shadow-[0_0_0_0_rgba(249,209,0,0)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-8px_rgba(249,209,0,0.6)]"
      : "border border-hairline text-parchment hover:-translate-y-0.5 hover:border-flame/45 hover:text-flame hover:bg-flame/[0.06]";
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} className={`${base} ${skin} ${className}`}>
      {busy && <LanternSpinner size={14} />}
      {children}
    </button>
  );
}

function MoneyInput({
  value,
  onChange,
  max,
  onMax,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  max?: string;
  onMax?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-hairline bg-[rgba(10,10,10,0.6)] px-4 py-3 focus-within:border-flame/45">
      <span className="text-[18px] text-faint">$</span>
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full bg-transparent font-display text-[22px] tabular-nums tracking-tight text-parchment outline-none placeholder:text-parchment/25"
        style={{ fontWeight: 560 }}
      />
      {max && onMax && (
        <button
          type="button"
          onClick={onMax}
          disabled={disabled}
          className="rounded-lg border border-hairline px-2.5 py-1 text-[11px] uppercase tracking-label text-faint transition-colors hover:border-flame/45 hover:text-flame"
        >
          All
        </button>
      )}
    </div>
  );
}

export function LanternConsole({ reads }: { reads: LanternReads }) {
  const m = useMessages();
  const ready = useReady();
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  const money = useActions();
  const draw = useActions();
  useActionScene(money.phase, money.label, m, "you");
  useActionScene(draw.phase, draw.label, m, "pool");

  const balance = useReveal(ADDRESSES.pool);
  usePeekScene(balance.reveal.state === "revealing" || balance.reveal.state === "revealed");

  const [panel, setPanel] = useState<null | "add" | "take">(null);
  const [amount, setAmount] = useState("");
  const parsed = parseAmount(amount);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const busy = money.busy || draw.busy;
  const needMoney = reads.walletTokens === 0n;
  const closePanel = () => {
    setPanel(null);
    setAmount("");
  };

  useEffect(() => {
    if (busy) setPanel(null);
  }, [busy]);

  const scanning = reads.phase === 1;
  const drawOpen = reads.nextDrawAt === 0 || now >= reads.nextDrawAt;
  const funded = reads.reserve >= reads.prizePerDraw && reads.prizePerDraw > 0n;
  const canDraw = scanning || (drawOpen && funded);
  const drawReason = !funded
    ? "The prize pool needs funding before a draw can run."
    : !drawOpen
      ? "The next draw is not open yet."
      : "";

  const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-5 sm:pb-7">
      <div className="glass-fill pointer-events-auto w-full max-w-2xl rounded-[22px] border border-hairline p-4 shadow-glass backdrop-blur-2xl sm:p-5">
        {!isConnected || !ready ? (
          <Connect onConnect={() => injected && connect({ connector: injected })} pending={isPending} />
        ) : (
          <>

            <YourLantern reads={reads} balance={balance} />

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {needMoney ? (
                <Btn
                  tone="primary"
                  busy={money.busy}
                  onClick={() => money.getTokens(FAUCET, () => reads.refetch())}
                >
                  Get practice money
                </Btn>
              ) : (
                <Btn tone="primary" onClick={() => setPanel(panel === "add" ? null : "add")} disabled={busy}>
                  Add money
                </Btn>
              )}

              <Btn
                busy={draw.busy}
                onClick={() => draw.runDraw(() => reads.refetch())}
                disabled={money.busy || !canDraw}
              >
                {scanning ? "Keep drawing" : "Run the draw"}
              </Btn>

              {reads.hasDeposited && (
                <Btn onClick={() => setPanel(panel === "take" ? null : "take")} disabled={busy}>
                  Take some out
                </Btn>
              )}

              {reads.hasDeposited && (
                <Btn busy={money.busy} onClick={() => money.claim(() => reads.refetch())} disabled={draw.busy}>
                  Claim a prize
                </Btn>
              )}

              {!needMoney && (
                <button
                  type="button"
                  onClick={() => money.getTokens(FAUCET, () => reads.refetch())}
                  disabled={busy}
                  className="ml-auto text-[12px] text-faint transition-colors hover:text-flame disabled:opacity-40"
                >
                  + practice money
                </button>
              )}
            </div>

            <p className="mt-2 text-[12px] text-faint">
              {!canDraw && drawReason
                ? drawReason
                : "Anyone can run tonight's draw. The winner stays secret, even from whoever runs it."}
            </p>

            {panel === "add" && (
              <AmountPanel
                title="How much do you want to save?"
                note="It becomes private the moment it lands. Only you will ever see the amount."
                cta="Put it in"
                value={amount}
                onChange={setAmount}
                max={formatAmount(reads.walletTokens)}
                onMax={() => setAmount(formatAmount(reads.walletTokens))}
                busy={money.busy}
                disabled={parsed === null || parsed > reads.walletTokens}
                overMax={parsed !== null && parsed > reads.walletTokens}
                onConfirm={() =>
                  parsed !== null &&
                  money.addToLantern(parsed, reads.allowance, () => {
                    closePanel();
                    reads.refetch();
                  })
                }
              />
            )}
            {panel === "take" && (
              <AmountPanel
                title="How much do you want to take out?"
                note="Your savings come straight back to your wallet."
                cta="Take it out"
                value={amount}
                onChange={setAmount}
                busy={money.busy}
                disabled={parsed === null}
                onConfirm={() =>
                  parsed !== null &&
                  money.withdraw(parsed, () => {
                    closePanel();
                    reads.refetch();
                  })
                }
              />
            )}

            <PhaseNote phase={money.phase} label={money.label} onDismiss={money.reset} />
            <PhaseNote phase={draw.phase} label={draw.label} onDismiss={draw.reset} />
          </>
        )}
      </div>
    </div>
  );
}

function Connect({ onConnect, pending }: { onConnect: () => void; pending: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <p className="text-[15px] text-parchment">Connect your wallet to light your lantern.</p>
      <Btn tone="primary" busy={pending} onClick={onConnect} className="px-6">
        Connect wallet
      </Btn>
    </div>
  );
}

function YourLantern({
  reads,
  balance,
}: {
  reads: LanternReads;
  balance: ReturnType<typeof useReveal>;
}) {
  const { reveal, open, reseal } = balance;

  if (!reads.hasDeposited) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-faint">Your lantern is empty. Add a little to start saving.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-label text-faint">Inside your lantern</p>
        <div className="mt-1.5 flex items-center gap-3">
          {reveal.state === "revealed" ? (
            <span className="font-display text-[24px] tabular-nums tracking-tight text-parchment" style={{ fontWeight: 620 }}>
              ${formatAmount(reveal.value)}
            </span>
          ) : reveal.state === "denied" ? (
            <span className="text-[13px] text-bad">Only the owner can look inside.</span>
          ) : reveal.state === "error" ? (
            <span className="text-[13px] text-bad">Could not open it just now.</span>
          ) : (
            <span className="inline-flex items-center gap-[3px]" aria-label="sealed">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="block h-[17px] w-[10px] rounded-[2px] bg-seal" />
              ))}
            </span>
          )}
        </div>
      </div>

      {reveal.state === "revealed" ? (
        <button
          type="button"
          onClick={reseal}
          className="text-[13px] text-faint transition-colors hover:text-parchment"
        >
          Hide
        </button>
      ) : (
        <button
          type="button"
          onClick={() => open(reads.balanceHandle)}
          disabled={reveal.state === "revealing"}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-flame transition-colors hover:text-flameSoft disabled:opacity-50"
        >
          {reveal.state === "revealing" ? <LanternSpinner size={13} /> : null}
          {reveal.state === "revealing" ? "Looking…" : "Peek inside"}
        </button>
      )}
    </div>
  );
}

function AmountPanel({
  title,
  note,
  cta,
  value,
  onChange,
  max,
  onMax,
  onConfirm,
  busy,
  disabled,
  overMax = false,
}: {
  title: string;
  note: string;
  cta: string;
  value: string;
  onChange: (v: string) => void;
  max?: string;
  onMax?: () => void;
  onConfirm: () => void;
  busy: boolean;
  disabled: boolean;
  overMax?: boolean;
}) {
  return (
    <div className="mt-4 border-t border-hairlineSoft pt-4">
      <p className="text-[14px] text-parchment">{title}</p>
      <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-faint">{note}</p>
      <div className="flex items-stretch gap-2.5">
        <div className="flex-1">
          <MoneyInput value={value} onChange={onChange} max={max} onMax={onMax} disabled={busy} />
        </div>
        <Btn tone="primary" busy={busy} disabled={disabled} onClick={onConfirm} className="px-5">
          {overMax ? "Not enough" : cta}
        </Btn>
      </div>
    </div>
  );
}

export function PrizeBanner({ reads }: { reads: LanternReads }) {
  const jackpot = reads.jackpot > 0n ? reads.jackpot : reads.prizePerDraw;
  const scanning = reads.phase === 1;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-10 flex flex-col items-center text-center">
      <p className="text-[11px] uppercase tracking-label text-faint">The prize tonight</p>
      <p
        className="mt-1 font-display leading-none tracking-tightest text-flame"
        style={{ fontWeight: 660, fontSize: "clamp(2.4rem, 6vw, 4rem)" }}
      >
        ${formatWhole(jackpot)}
      </p>
      <p className="mt-2 text-[13px] text-muted">
        {reads.depositors.toLocaleString()} {reads.depositors === 1 ? "person" : "people"} saving
        <span className="mx-2 text-faint">·</span>
        {scanning ? "picking a winner…" : "a winner can be drawn any time"}
      </p>
    </div>
  );
}
