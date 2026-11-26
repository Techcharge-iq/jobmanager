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

export interface NavItem { id: ViewId; label: string; icon: LucideIcon; roles?: string[]; tile: string }

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home, tile: "from-violet-500 to-fuchsia-500" },
  { id: "approved-jobs", label: "Approved jobs", icon: CheckCircle, tile: "from-emerald-400 to-teal-600" },
  { id: "admin", label: "Job administration", icon: Shield, roles: ["admin", "manager"], tile: "from-amber-400 to-orange-600" },
  { id: "reports", label: "Reports & analytics", icon: BarChart3, roles: ["admin", "manager", "salesman"], tile: "from-sky-400 to-blue-600" },
  { id: "admin-management", label: "User management", icon: UsersRound, roles: ["admin", "manager"], tile: "from-pink-400 to-rose-600" },
  { id: "user-access", label: "User access control", icon: UserCheck, roles: ["admin"], tile: "from-indigo-400 to-violet-700" },
  { id: "settings", label: "Settings", icon: Settings, tile: "from-slate-400 to-slate-700" },
];

export function pathToView(pathname: string): ViewId {
  const hit = (Object.keys(VIEW_META) as ViewId[]).find((v) => VIEW_META[v].path === pathname);
  return hit ?? "dashboard";
}

export const visibleNav = (role: string) => NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
