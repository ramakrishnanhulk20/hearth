"use client";

import { useConnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { CAP_LABEL, PrimaryButton, PrimaryLink } from "@/components/app/console";
import type { NextStep } from "./nextStep";

/**
 * The single thing to do next, directly under the page title.
 *
 * The reference console puts its one button at the foot of the form it belongs to. Here the
 * action is not the end of a form, it is the reason a newcomer opened the app, so it sits above
 * the two cards that explain it.
 */
export function NextAction({ step }: { step: NextStep }) {
  return (
    <section className="mb-6">
      <p className={CAP_LABEL}>Next</p>
      <p className="mt-2.5 text-[19px] font-semibold leading-snug text-parchment">{step.title}</p>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-muted">{step.detail}</p>
      {/* The one place the console's primary control is not the foot of a form, so it is capped
          to something the width of its own words. Run edge to edge here and a bar of flame wider
          than the sentence explaining it is the first and loudest thing on the app. */}
      {step.cta !== null && (
        <div className="mt-5 sm:max-w-[20rem]">
          <Control step={step} />
        </div>
      )}
    </section>
  );
}

/** The console's primary control, as a button where the step is something the wallet does. */
function Control({ step }: { step: NextStep }) {
  const { connect, connectors, isPending } = useConnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (step.act === "connect") {
    const injected = connectors.find((connector) => connector.type === "injected") ?? connectors[0];
    return (
      <PrimaryButton
        busy={isPending}
        disabled={!injected}
        onClick={() => injected && connect({ connector: injected })}
      >
        {injected ? step.cta : "No wallet found"}
      </PrimaryButton>
    );
  }

  if (step.act === "switch") {
    return (
      <PrimaryButton busy={switching} onClick={() => switchChain({ chainId: sepolia.id })}>
        {step.cta}
      </PrimaryButton>
    );
  }

  return (
    <PrimaryLink href={step.href ?? "/app"} tone={step.tone === "quiet" ? "quiet" : "flame"}>
      {step.cta}
    </PrimaryLink>
  );
}
