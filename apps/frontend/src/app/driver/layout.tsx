import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="driver">{children}</DashboardLayout>;
}
