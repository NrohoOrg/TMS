"use client";

import dynamic from "next/dynamic";

const AdminUsers = dynamic(
  () => import("@/features/admin/components/AdminUsers"),
  { ssr: false },
);

export default function AdminUsersRoute() {
  return <AdminUsers />;
}
