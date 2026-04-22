"use client";

import dynamic from "next/dynamic";

const AdminConfig = dynamic(
  () => import("@/features/admin/components/AdminConfig"),
  { ssr: false },
);

export default function AdminConfigRoute() {
  return <AdminConfig />;
}
