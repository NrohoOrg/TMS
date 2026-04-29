"use client";

import dynamic from "next/dynamic";

const DispatcherIncidents = dynamic(
  () => import("@/features/dispatcher/components/DispatcherIncidents"),
  { ssr: false },
);

export default function DispatcherIncidentsRoute() {
  return <DispatcherIncidents />;
}
