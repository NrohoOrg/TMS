"use client";

import dynamic from "next/dynamic";

const DispatcherGlobalMap = dynamic(
  () => import("@/features/dispatcher/components/DispatcherGlobalMap"),
  { ssr: false },
);

export default function AdminMapRoute() {
  return <DispatcherGlobalMap readOnly />;
}
