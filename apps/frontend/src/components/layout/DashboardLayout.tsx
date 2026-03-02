"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Truck,
  UserCheck,
  Settings,
  FileText,
  Activity,
  ClipboardList,
  CalendarDays,
  Route,
  Monitor,
  BarChart3,
  MapPin,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/* ── Types ── */
type UserRole = "admin" | "dispatcher" | "driver";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

/* ── Static navigation config ── */
const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Fleet", path: "/admin/fleet", icon: Truck },
    { label: "Drivers", path: "/admin/drivers", icon: UserCheck },
    { label: "Configuration", path: "/admin/config", icon: Settings },
    { label: "Audit Log", path: "/admin/audit", icon: FileText },
    { label: "System Health", path: "/admin/health", icon: Activity },
  ],
  dispatcher: [
    { label: "Dashboard", path: "/dispatcher", icon: LayoutDashboard },
    { label: "Tasks", path: "/dispatcher/tasks", icon: ClipboardList },
    { label: "Driver Availability", path: "/dispatcher/availability", icon: CalendarDays },
    { label: "Planning", path: "/dispatcher/planning", icon: Route },
    { label: "Execution Monitor", path: "/dispatcher/monitor", icon: Monitor },
    { label: "Reports", path: "/dispatcher/reports", icon: BarChart3 },
  ],
  driver: [
    { label: "My Route", path: "/driver", icon: MapPin },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  dispatcher: "Dispatcher",
  driver: "Driver",
};

/* ── Mock user — swap this to use a real user context later ── */
const MOCK_USER = {
  name: "Karim Benali",
  email: "admin@tms.dz",
  role: "admin" as UserRole,
};

/* ── Component ── */
export interface DashboardLayoutProps {
  children: ReactNode;
  /** Override the mock role to render a different sidebar nav. */
  role?: UserRole;
}

export default function DashboardLayout({
  children,
  role,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeRole = role ?? MOCK_USER.role;
  const navItems = NAV_ITEMS[activeRole];

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar flex flex-col shrink-0 transform transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center overflow-hidden">
            <Image src="/TMS_LOGO.png" alt="TMS Logo" width={28} height={28}  />
          </div>
          <div>
            <span className="text-lg font-display font-bold text-sidebar-primary">
              TMS
            </span>
            <span className="text-[10px] block text-sidebar-foreground/50 -mt-0.5 tracking-wider uppercase">
              {ROLE_LABELS[activeRole]}
            </span>
          </div>
          {/* Close (mobile) */}
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <Separator className="bg-sidebar-border mx-4" />

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px]",
                    isActive && "text-sidebar-primary",
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-sidebar-primary opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-primary">
              {MOCK_USER.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-sidebar-foreground truncate">
                {MOCK_USER.name}
              </div>
              <div className="text-xs text-sidebar-foreground/50 truncate">
                {MOCK_USER.email}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={() => router.push("/login")}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 bg-background border-b border-border p-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/TMS_LOGO.png" alt="TMS Logo" width={24} height={24} />
            <span className="font-display font-bold text-foreground">TMS</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
