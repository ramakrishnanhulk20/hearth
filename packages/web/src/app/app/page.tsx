import type { Metadata } from "next";
import { AppScreen } from "@/components/app/AppScreen";

export const metadata: Metadata = {
  title: "The pool",
  description: "Deposit, reveal, run the draw, claim and withdraw, with every amount encrypted on chain.",
};

export default function AppPage() {
  return <AppScreen />;
}
