"use client";

import dynamic from "next/dynamic";

const LoginPage = dynamic(
  () => import("@/features/auth/components/LoginPage"),
  { ssr: false },
);

export default function LoginRoute() {
  return <LoginPage />;
}
