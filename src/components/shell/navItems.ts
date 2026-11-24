import { BarChart3, CheckCircle, Home, Settings, Shield, UserCheck, UsersRound, type LucideIcon } from "lucide-react";

export type ViewId = "dashboard" | "approved-jobs" | "admin" | "admin-management" | "user-access" | "reports" | "settings";

export const VIEW_META: Record<ViewId, { title: string; path: string }> = {
  dashboard: { title: "Dashboard", path: "/dashboard" },
  "approved-jobs": { title: "Approved jobs", path: "/jobs/approved" },
  admin: { title: "Job administration", path: "/admin/jobs" },
  reports: { title: "Reports", path: "/reports" },
  "admin-management": { title: "User management", path: "/admin/users" },
  "user-access": { title: "User access", path: "/admin/access" },
  settings: { title: "Settings", path: "/settings" },
};

export interface NavItem { id: ViewId; label: string; icon: LucideIcon; roles?: string[] }

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "approved-jobs", label: "Approved jobs", icon: CheckCircle },
  { id: "admin", label: "Job administration", icon: Shield, roles: ["admin", "manager"] },
  { id: "reports", label: "Reports & analytics", icon: BarChart3, roles: ["admin", "manager", "salesman"] },
  { id: "admin-management", label: "User management", icon: UsersRound, roles: ["admin", "manager"] },
  { id: "user-access", label: "User access control", icon: UserCheck, roles: ["admin"] },
  { id: "settings", label: "Settings", icon: Settings },
];

export function pathToView(pathname: string): ViewId {
  const hit = (Object.keys(VIEW_META) as ViewId[]).find((v) => VIEW_META[v].path === pathname);
  return hit ?? "dashboard";
}

export const visibleNav = (role: string) => NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
