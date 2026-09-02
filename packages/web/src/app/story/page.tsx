"use client";

import dynamic from "next/dynamic";

const StoryExperience = dynamic(
  () => import("@/components/story/StoryExperience").then((m) => m.StoryExperience),
  { ssr: false },
);

export default function StoryPreviewPage() {
  return <StoryExperience />;
}
