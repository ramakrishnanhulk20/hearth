import type { Metadata } from "next";
import { CeremonyScreen } from "@/components/lab/Ceremony";

export const metadata: Metadata = {
  title: "The draw ceremony",
  description: "A lab page: the sealed seed opening, the bracket, the thresholds and one saver's own result.",
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return <CeremonyScreen />;
}
