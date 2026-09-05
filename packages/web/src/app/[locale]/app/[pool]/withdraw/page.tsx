import type { Metadata } from "next";
import { PageHeader } from "@/components/app/console";
import { WithdrawScreen } from "@/components/app/withdraw/WithdrawScreen";

export const metadata: Metadata = {
  title: "Withdraw",
  description:
    "Take principal and winnings out of the Hearth vault, then unshield confidential USDC back into plain USDC.",
};

export default function WithdrawPage() {
  return (
    <>
      <PageHeader
        title="Withdraw"
        subtitle="Two stages: out of the vault, then back into plain USDC. Principal is never locked, including in the middle of a draw."
      />
      <WithdrawScreen />
    </>
  );
}
