import { StoryLanding } from "@/components/story/StoryLanding";
import { readPoolStats } from "@/lib/chain/pool";

export const revalidate = 30;

export default async function HomePage() {
  const stats = await readPoolStats();
  return <StoryLanding stats={stats} />;
}
