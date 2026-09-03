import type { Metadata } from "next";
import { VerifyScreen } from "@/components/verify/VerifyScreen";

export const metadata: Metadata = {
  title: "Verify a draw",
  description:
    "Read a draw's seed, bracket, harvest and prize sizes straight from the contracts, and get the exact threshold any address had to beat.",
};

export default function VerifyPage() {
  return <VerifyScreen />;
}
