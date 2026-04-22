"use client";

import { type ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Settings,
  Activity,
  ClipboardList,
  CalendarDays,
  Route as RouteIcon,
  Monitor,
  BarChart3,
  MapPin,
  LogOut,
  Map as MapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

type UserRole = "admin" | "dispatcher" | "driver";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Live Map", path: "/admin/map", icon: MapIcon },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Drivers", path: "/admin/drivers", icon: UserCheck },
    { label: "Configuration", path: "/admin/config", icon: Settings },
    { label: "System Health", path: "/admin/health", icon: Activity },
  ],
  dispatcher: [
    { label: "Dashboard", path: "/dispatcher", icon: LayoutDashboard },
    { label: "Tasks", path: "/dispatcher/tasks", icon: ClipboardList },
    { label: "Availability", path: "/dispatcher/availability", icon: CalendarDays },
    { label: "Planning", path: "/dispatcher/planning", icon: RouteIcon },
    { label: "Live Map", path: "/dispatcher/map", icon: MapIcon },
    { label: "Monitor", path: "/dispatcher/monitor", icon: Monitor },
    { label: "Reports", path: "/dispatcher/reports", icon: BarChart3 },
  ],
  driver: [{ label: "My Route", path: "/driver", icon: MapPin }],
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  dispatcher: "Dispatcher",
  driver: "Driver",
};

function buildBreadcrumb(pathname: string, navItems: NavItem[]): string {
  const exact = navItems.find((item) => item.path === pathname);
  if (exact) return exact.label;
  const matches = navItems
    .filter((item) => pathname.startsWith(item.path) && item.path !== "/")
    .sort((a, b) => b.path.length - a.path.length);
  return matches[0]?.label ?? "";
}

export interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  const activeRole: UserRole = user
    ? (user.role.toLowerCase() as UserRole)
    : "dispatcher";
  const navItems = NAV_ITEMS[activeRole] || [];

  const userName = user?.name ?? "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const links = navItems.map((item) => ({
    label: item.label,
    href: item.path,
    icon: (
      <item.icon
        className={cn(
          "text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0",
          (pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path + "/"))) &&
            "text-sidebar-primary",
        )}
      />
    ),
  }));

  if (isLoading || !user) return null;

  const breadcrumb = buildBreadcrumb(pathname, navItems);

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
                label: userName,
                href: "#",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-sidebar-accent flex items-center justify-center">
                    <span className="text-xs font-semibold text-sidebar-primary">
                      {userInitials}
                    </span>
                  </div>
                ),
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mt-2"
              onClick={async () => {
                await logout();
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {open && <span>Sign Out</span>}
            </Button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground hidden sm:block">
              {ROLE_LABELS[activeRole]}
            </div>
            <span className="text-muted-foreground hidden sm:block">/</span>
            <div className="text-sm font-display font-semibold text-foreground truncate">
              {breadcrumb || "Workspace"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{user.email}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

const Logo = () => (
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

const LogoIcon = () => (
  <Link
    href="#"
    className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
  >
    <div className="h-8 w-8 rounded-lg bg-sidebar-accent flex items-center justify-center overflow-hidden flex-shrink-0">
      <Image src="/TMS_LOGO.png" alt="TMS Logo" width={28} height={28} />
    </div>
  </Link>
);
