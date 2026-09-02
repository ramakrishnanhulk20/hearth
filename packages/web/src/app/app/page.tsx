import type { Metadata } from "next";
import { AppScreen } from "@/components/app/AppScreen";

export const metadata: Metadata = {
  title: "Lantern, the pool",
  description: "Deposit, draw, claim and withdraw, all with amounts encrypted on chain.",
};

export default function AppPage() {
  return <AppScreen />;
}
