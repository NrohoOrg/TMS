"use client";

import dynamic from "next/dynamic";

const DispatcherReports = dynamic(
  () => import("@/features/dispatcher/components/DispatcherReports"),
  { ssr: false },
);

export default function DispatcherReportsRoute() {
  return <DispatcherReports />;
}
