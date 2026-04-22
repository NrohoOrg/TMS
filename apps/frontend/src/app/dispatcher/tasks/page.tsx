"use client";

import dynamic from "next/dynamic";

const DispatcherTasks = dynamic(
  () => import("@/features/dispatcher/components/DispatcherTasks"),
  { ssr: false },
);

export default function DispatcherTasksRoute() {
  return <DispatcherTasks />;
}
