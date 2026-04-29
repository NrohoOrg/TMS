"use client";

import dynamic from "next/dynamic";

const DispatcherOperations = dynamic(
  () => import("@/features/dispatcher/components/DispatcherOperations"),
  { ssr: false },
);

export default function DispatcherOperationsRoute() {
  return <DispatcherOperations />;
}
