import { Landing } from "@/components/story/Landing";
import { readPoolStats } from "@/lib/chain/read";

export const revalidate = 30;

export default async function HomePage() {
  const stats = await readPoolStats();
  return <Landing stats={stats} />;
}
