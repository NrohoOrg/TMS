"use client";

import { type ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Activity,
  ClipboardList,
  ListChecks,
  Route as RouteIcon,
  MapPin,
  LogOut,
  Map as MapIcon,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/i18n/LanguageSwitch";

type UserRole = "admin" | "dispatcher" | "driver" | "cadre";

interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { labelKey: "nav.dashboard", path: "/admin", icon: LayoutDashboard },
    { labelKey: "nav.users", path: "/admin/users", icon: Users },
    { labelKey: "nav.drivers", path: "/admin/drivers", icon: UserCheck },
    { labelKey: "nav.systemHealth", path: "/admin/health", icon: Activity },
  ],
  dispatcher: [
    { labelKey: "nav.tasks", path: "/dispatcher/tasks", icon: ClipboardList },
    { labelKey: "nav.drivers", path: "/dispatcher/availability", icon: Users },
    { labelKey: "nav.planning", path: "/dispatcher/planning", icon: RouteIcon },
    { labelKey: "nav.operations", path: "/dispatcher/operations", icon: MapIcon },
    { labelKey: "nav.incidents", path: "/dispatcher/incidents", icon: AlertTriangle },
  ],
  driver: [{ labelKey: "nav.myRoute", path: "/driver", icon: MapPin }],
  cadre: [
    { labelKey: "nav.addTask", path: "/cadre/new", icon: PlusCircle },
    { labelKey: "nav.myTasks", path: "/cadre/tasks", icon: ListChecks },
  ],
};

const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  admin: "roles.administrator",
  dispatcher: "roles.dispatcher",
  driver: "roles.driver",
  cadre: "roles.cadre",
};

function buildBreadcrumbKey(pathname: string, navItems: NavItem[]): string {
  const exact = navItems.find((item) => item.path === pathname);
  if (exact) return exact.labelKey;
  const matches = navItems
    .filter((item) => pathname.startsWith(item.path) && item.path !== "/")
    .sort((a, b) => b.path.length - a.path.length);
  return matches[0]?.labelKey ?? "";
}

export interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { t } = useTranslation();
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
    label: t(item.labelKey),
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

  const breadcrumbKey = buildBreadcrumbKey(pathname, navItems);
  const breadcrumb = breadcrumbKey ? t(breadcrumbKey) : "";

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
            <LanguageSwitch collapsed={!open} className="mt-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mt-2"
              onClick={async () => {
                await logout();
              }}
            >
              <LogOut className="w-4 h-4 me-2" />
              {open && <span>{t("nav.signOut")}</span>}
            </Button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground hidden sm:block">
              {t(ROLE_LABEL_KEYS[activeRole])}
            </div>
            <span className="text-muted-foreground hidden sm:block">/</span>
            <div className="text-sm font-display font-semibold text-foreground truncate">
              {breadcrumb || t("nav.workspace")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{user.email}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <div className="animate-fade-in min-w-0">{children}</div>
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
      <Image src="/Nroho_Logo.png" alt="Nroho Logo" width={28} height={28} />
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
      <Image src="/Nroho_Logo.png" alt="Nroho Logo" width={28} height={28} />
    </div>
  </Link>
);
