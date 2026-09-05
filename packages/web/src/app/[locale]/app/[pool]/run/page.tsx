import type { Metadata } from "next";
import { PageHeader } from "@/components/app/console";
import { RunScreen } from "@/components/app/run/RunScreen";

export const metadata: Metadata = {
  title: "Run a draw",
  description:
    "Close, award, advance, finalize and reconcile. Every step of a Hearth draw is callable by any wallet.",
};

export default function RunPage() {
  return (
    <>
      <PageHeader
        title="Run a draw"
        subtitle="A draw takes five transactions. Every one of them is callable by any wallet, yours included."
      />
      <RunScreen />
    </>
  );
}
