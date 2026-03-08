"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import { useLogout, useRequireAuth } from "@/features/auth";

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

/* ── Component ── */
export interface DashboardLayoutProps {
  children: ReactNode;
  /** Override the mock role to render a different sidebar nav. */
  role?: UserRole;
}

export default function DashboardLayout({
  children,
  role = "admin",
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useRequireAuth();
  const logoutMutation = useLogout();

  // Derive role from auth store when available, fall back to prop
  const activeRole: UserRole = user
    ? (user.role.toLowerCase() as UserRole)
    : role || "admin";
  const displayName = user?.name ?? "User";
  const navItems = NAV_ITEMS[activeRole] || [];

  // Convert nav items to sidebar links format
  const links = navItems.map((item) => ({
    label: item.label,
    href: item.path,
    icon: (
      <item.icon
        className={cn(
          "text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0",
          pathname === item.path && "text-sidebar-primary dark:text-sidebar-primary"
        )}
      />
    ),
  }));

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: displayName,
                href: "#",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-sidebar-accent flex items-center justify-center">
                    <span className="text-xs font-semibold text-sidebar-primary">
                      {displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                ),
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mt-2"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {open && <span>Sign Out</span>}
            </Button>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <div className="h-8 w-8 rounded-lg bg-sidebar-accent flex items-center justify-center overflow-hidden flex-shrink-0">
        <Image src="/TMS_LOGO.png" alt="TMS Logo" width={28} height={28} />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display font-bold text-sidebar-primary whitespace-pre"
      >
        TMS
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <div className="h-8 w-8 rounded-lg bg-sidebar-accent flex items-center justify-center overflow-hidden flex-shrink-0">
        <Image src="/TMS_LOGO.png" alt="TMS Logo" width={28} height={28} />
      </div>
    </Link>
  );
};
