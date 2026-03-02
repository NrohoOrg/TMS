import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="dispatcher">{children}</DashboardLayout>;
}
