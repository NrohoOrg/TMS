"use client";

import dynamic from "next/dynamic";

const DispatcherPlanning = dynamic(
  () => import("@/features/dispatcher/components/DispatcherPlanning"),
  { ssr: false },
);

export default function DispatcherPlanningRoute() {
  return <DispatcherPlanning />;
}
