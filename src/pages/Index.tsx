import { useState, lazy, Suspense, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDexieJobs } from "@/hooks/useDexieJobs";
import { useAuth } from "@/hooks/useAuth";
import { getProfileRole } from "@/data/profiles";
import { CreateJobOrderDialog } from "@/components/CreateJobOrderDialog";
import { useJobActions } from "@/hooks/useJobActions";
import type { DashboardJob as Job, JobStatus } from "@/types/jobOrder";
import { transformDexieJobOrder } from "@/utils/jobOrderTransforms";
import { CommandPalette } from "@/components/command/CommandPalette";
import { QuickInvoiceWidget } from "@/components/command/QuickInvoiceWidget";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/shell/AppShell";
import { JobDetailsPanel } from "@/components/shell/JobDetailsPanel";
import { EnterStagger } from "@/components/shell/EnterStagger";
import { useTabShortcuts } from "@/components/shell/useTabShortcuts";
import { VIEW_META, pathToView, type ViewId } from "@/components/shell/navItems";
import { useTabs, tabUrl, type AppTab } from "@/hooks/useTabs";
import Unauthorized from "./Unauthorized";

// Lazy loaded components for performance
const ModernDashboard = lazy(() => import("@/components/ModernDashboard").then(m => ({ default: m.ModernDashboard })));
const SettingsView = lazy(() => import("@/components/SettingsView").then(m => ({ default: m.SettingsView })));
const AdminJobManagement = lazy(() => import("@/components/AdminJobManagement").then(m => ({ default: m.AdminJobManagement })));
const AdminManagement = lazy(() => import("@/components/AdminManagement").then(m => ({ default: m.AdminManagement })));
const ReportsPage = lazy(() => import("@/components/ReportsPage").then(m => ({ default: m.ReportsPage })));
const ApprovedJobsList = lazy(() => import("@/components/job-management/ApprovedJobsList").then(m => ({ default: m.ApprovedJobsList })));
const UserAccessManagement = lazy(() => import("@/components/UserAccessManagement").then(m => ({ default: m.default })));

export type { DashboardJob as Job, JobStatus } from "@/types/jobOrder";

/** Content placeholder: no layout shift when a tab opens. */
const PageSkeleton = () => (
  <div role="status" aria-label="Loading" className="space-y-4 p-4 md:p-6">
    <Skeleton className="h-28 w-full rounded-3xl" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
    <Skeleton className="h-64 w-full rounded-2xl" />
  </div>
);

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const jobParam = new URLSearchParams(location.search).get("job");
  const currentView: ViewId = pathToView(location.pathname);

  const [userRole, setUserRole] = useState<string>("employee");
  const [userRoleLoading, setUserRoleLoading] = useState(true);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false);
  const [invoiceJobId, setInvoiceJobId] = useState<string | null>(null);
  const [bounce, setBounce] = useState<{ view: string; n: number } | null>(null);
  const bounceCount = useRef(0);
  const { user } = useAuth();
  const userId = user?.id;

  const { tabs, activeId, activeTab, openView, openJob, activate, close, closeOthers, togglePin, reorder, syncJobTitles } = useTabs(userId);

  // Use Dexie for offline-first job data
  // Pass true for returnAllJobs to get all jobs for dashboard stats
  const { jobs: dexieJobs, isLoading, isSyncing, syncError, refresh } = useDexieJobs({}, 1, 50, true);
  const { setJobStatus } = useJobActions();

  const restrictedRoles: Partial<Record<ViewId, string[]>> = {
    admin: ["admin", "manager"],
    "admin-management": ["admin", "manager"],
    "user-access": ["admin"],
    reports: ["admin", "manager", "salesman"],
  };

  // Fetch role on load
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!userId) {
        setUserRoleLoading(false);
        return;
      }
      try {
        const role = await getProfileRole(userId);
        if (role) setUserRole(role);
      } catch {
        setUserRole("employee");
      } finally {
        setUserRoleLoading(false);
      }
    };
    setUserRoleLoading(true);
    fetchUserRole();
  }, [userId]);

  const transformedJobs: Job[] = (dexieJobs || []).map(transformDexieJobOrder);

  // The URL is the source of truth: make sure a tab exists for whatever the URL shows.
  useEffect(() => {
    if (jobParam) openJob(jobParam);
    else openView(currentView);
  }, [jobParam, currentView, openJob, openView]);

  // Give job tabs their job order number once the cache has loaded.
  useEffect(() => {
    if (dexieJobs?.length) syncJobTitles(dexieJobs.map((j) => ({ id: j.id, jobOrderNumber: j.job_order_number })));
  }, [dexieJobs, syncJobTitles]);

  const go = useCallback((url: string) => {
    if (url !== location.pathname + location.search) navigate(url);
  }, [location.pathname, location.search, navigate]);

  const handleStatusUpdate = async (jobId: string, status: JobStatus) => {
    await setJobStatus(jobId, status);
  };

  const handleViewJob = useCallback((job: Pick<Job, "id" | "jobOrderNumber">) => {
    openJob(job.id, job.jobOrderNumber);
    go(`${VIEW_META.dashboard.path}?job=${encodeURIComponent(job.id)}`);
  }, [openJob, go]);

  const handleViewChange = useCallback((view: string) => {
    if (view === "create") {
      setIsCreateJobOpen(true);
      return;
    }
    const target = (view in VIEW_META ? view : "dashboard") as ViewId;
    openView(target);
    bounceCount.current += 1;
    setBounce({ view: target, n: bounceCount.current });
    go(VIEW_META[target].path);
  }, [openView, go]);

  const activateTab = useCallback((tab: AppTab) => {
    activate(tab.id);
    go(tabUrl(tab));
  }, [activate, go]);

  const closeTab = useCallback((id: string) => {
    go(tabUrl(close(id)));
  }, [close, go]);

  const closeOtherTabs = useCallback((id: string) => {
    go(tabUrl(closeOthers(id)));
  }, [closeOthers, go]);

  useTabShortcuts({
    onNew: useCallback(() => setPaletteOpen(true), []),
    onCloseActive: useCallback(() => closeTab(activeId), [closeTab, activeId]),
    onJump: useCallback((index: number) => { const tab = tabs[index]; if (tab) activateTab(tab); }, [tabs, activateTab]),
  });

  const renderContent = () => {
    if (isLoading && !jobParam) return <PageSkeleton />;

    if (jobParam) {
      const job = transformedJobs.find((j) => j.id === jobParam) ?? null;
      return <JobDetailsPanel key={jobParam} job={job} loading={isLoading} onClose={() => closeTab(`job:${jobParam}`)} />;
    }

    switch (currentView) {
      case "dashboard":
        return (
          <ModernDashboard
            jobs={transformedJobs}
            onViewChange={handleViewChange}
            onOpenJob={handleViewJob}
            quickWidget={<QuickInvoiceWidget jobs={transformedJobs} isAdmin={userRole === "admin"} onSaved={refresh} />}
          />
        );
      case "approved-jobs":
        return (
          <ApprovedJobsList
            jobs={transformedJobs}
            onStatusUpdate={handleStatusUpdate}
            isSyncing={isSyncing}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        );
      case "settings":
        return <SettingsView />;
      case "admin":
        return <AdminJobManagement onStatusUpdate={handleStatusUpdate} />;
      case "admin-management":
        return <AdminManagement />;
      case "reports":
        return <ReportsPage />;
      case "user-access":
        return <UserAccessManagement />;
      default:
        return <ModernDashboard jobs={transformedJobs} onViewChange={handleViewChange} onOpenJob={handleViewJob} />;
    }
  };

  const effectiveView: ViewId = jobParam ? "dashboard" : currentView;
  const requiredRoles = restrictedRoles[effectiveView];
  if (userRoleLoading) {
    return <PageSkeleton />;
  }
  if (requiredRoles && !requiredRoles.includes(userRole)) {
    return <Unauthorized />;
  }

  const fillsViewport = effectiveView === "dashboard" && !jobParam;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <AppShell
        currentView={currentView}
        userRole={userRole}
        tabs={tabs}
        activeId={activeId}
        bounce={bounce}
        onNavigate={handleViewChange}
        onOpenPalette={() => setPaletteOpen(true)}
        onQuickInvoice={() => { setInvoiceJobId(null); setInvoiceSheetOpen(true); }}
        onActivateTab={activateTab}
        onCloseTab={closeTab}
        onCloseOthers={closeOtherTabs}
        onTogglePin={togglePin}
        onReorder={reorder}
      >
        {(isSyncing || syncError) && (
          <div
            role="status"
            className={`px-4 py-2 text-sm ${
              syncError
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {syncError
              ? `Data sync failed: ${syncError}. Retry with Refresh.`
              : "Synchronizing the latest job data..."}
          </div>
        )}
        <div className={fillsViewport ? "dashboard-shell" : "min-h-0 flex-1 overflow-y-auto pb-32"}>
          <Suspense fallback={<PageSkeleton />}>
            <EnterStagger key={jobParam ?? currentView} className="flex min-h-0 flex-1 flex-col">
              {renderContent()}
            </EnterStagger>
          </Suspense>
        </div>
      </AppShell>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        jobs={transformedJobs}
        tabs={tabs}
        activeId={activeTab.id}
        userRole={userRole}
        onNavigate={handleViewChange}
        onOpenJob={handleViewJob}
        onQuickInvoice={(job) => { setInvoiceJobId(job?.id ?? null); setInvoiceSheetOpen(true); }}
        onActivateTab={activateTab}
        onCloseActiveTab={() => closeTab(activeId)}
      />
      <Sheet open={invoiceSheetOpen} onOpenChange={setInvoiceSheetOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-4xl overflow-y-auto rounded-t-3xl">
          <SheetHeader><SheetTitle>Update invoice no. & value</SheetTitle></SheetHeader>
          <div className="mt-4">
            <QuickInvoiceWidget jobs={transformedJobs} isAdmin={userRole === "admin"} initialJobId={invoiceJobId} onSaved={refresh} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Job Order Dialog */}
      <CreateJobOrderDialog
        open={isCreateJobOpen}
        onOpenChange={setIsCreateJobOpen}
      />
    </>
  );
};

export default Index;
