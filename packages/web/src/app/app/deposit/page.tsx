import type { Metadata } from "next";
import { PageHeader } from "@/components/app/console";
import { DepositFlow } from "@/components/app/deposit/DepositFlow";

export const metadata: Metadata = {
  title: "Deposit",
  description: "Get test USDC, shield it into confidential USDC, then deposit it into the Hearth vault.",
};

export default function DepositPage() {
  return (
    <>
      <PageHeader
        title="Deposit"
        subtitle="Get test USDC, shield it into confidential USDC, then put it into the vault."
      />
      <DepositFlow />
    </>
  );
}
