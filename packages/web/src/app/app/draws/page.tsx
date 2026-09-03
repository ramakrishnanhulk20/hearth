import type { Metadata } from "next";
import { DrawsScreen } from "@/components/app/draws/DrawsScreen";

export const metadata: Metadata = {
  title: "My draws",
  description: "What each recent draw paid, and what it paid you, with your weight and prize encrypted until you open them.",
};

export default function DrawsPage() {
  return <DrawsScreen />;
}
