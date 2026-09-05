import type { Metadata } from "next";
import { PageHeader } from "@/components/app/console";
import { Dashboard } from "@/components/app/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "What this wallet holds, what the prize pool is worth, and the next step, with every saver amount encrypted on chain.",
};

export default function AppPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="What you hold, what the pool is doing, and the one thing to do next."
      />
      <Dashboard />
    </>
  );
}
