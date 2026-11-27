import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { CreateJobOrderDialog } from "@/components/CreateJobOrderDialog";
import { useAuth } from "@/hooks/useAuth";

export function FloatingCreateButton() {
  const { user } = useAuth();
  const [isCreateJobDialogOpen, setIsCreateJobDialogOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setIsCreateJobDialogOpen(true)}
        disabled={!isOnline}
        title={isOnline ? "Create a job order" : "Connect to the internet to create a job order"}
        className="fixed bottom-20 end-5 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Create New Job Order"
      >
        <Plus className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" />
      </button>

      <CreateJobOrderDialog open={isCreateJobDialogOpen} onOpenChange={setIsCreateJobDialogOpen} />
    </>
  );
}
