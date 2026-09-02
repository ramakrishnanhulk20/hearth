"use client";

import { useSmoothScroll } from "@/hooks/useScroll";
import { CycleSection, FairSection, HiddenSection } from "./sections/Story";
import { DrawSection } from "./sections/DrawSection";
import { ClosingSection, SiteFooter } from "./sections/Closing";

export function BelowFold() {
  useSmoothScroll();

  return (
    <>
      <CycleSection />
      <DrawSection />
      <HiddenSection />
      <FairSection />
      <ClosingSection />
      <SiteFooter />
    </>
  );
}
