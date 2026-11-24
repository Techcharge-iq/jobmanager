import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import { subscribeJobEdits } from "@/lib/realtime";
import { useNotifications } from "@/contexts/NotificationContext";
import { isSyncAvailable } from "@/services/syncService";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "next-themes";
import { DirectionProvider } from "@/lib/direction";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WorkflowAlertManager } from "@/components/WorkflowAlertManager";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5 minutes
      gcTime: 30 * 60_000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

function JobEditNotifications() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    let stopSubscription: (() => void) | null = null;
    const updateSubscription = () => {
      if (isSyncAvailable() && !stopSubscription) {
        stopSubscription = subscribeJobEdits((audit) => {
          const editorName = audit.edited_by_name || "Someone";
          addNotification({
            type: "status_change",
            message: `${editorName} updated job #${audit.job_order_number}.`,
            jobOrderNumber: audit.job_order_number,
            read: false,
          });
        }, userId);
      } else if (!isSyncAvailable() && stopSubscription) {
        stopSubscription();
        stopSubscription = null;
      }
    };

    updateSubscription();
    window.addEventListener("online", updateSubscription);
    window.addEventListener("offline", updateSubscription);
    document.addEventListener("visibilitychange", updateSubscription);
    return () => {
      window.removeEventListener("online", updateSubscription);
      window.removeEventListener("offline", updateSubscription);
      document.removeEventListener("visibilitychange", updateSubscription);
      stopSubscription?.();
    };
  }, [userId, addNotification]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="theme">
    <DirectionProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <Toaster />
              <Sonner />
              <JobEditNotifications />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/jobs/approved" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/jobs" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/access" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/reports" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              <WorkflowAlertManager />
            </div>
          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
    </DirectionProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
