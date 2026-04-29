"use client";

import dynamic from "next/dynamic";

const CadreTasks = dynamic(() => import("@/features/cadre/components/CadreTasks"), {
  ssr: false,
});

export default function CadreTasksRoute() {
  return <CadreTasks />;
}
