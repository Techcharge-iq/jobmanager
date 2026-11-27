import { AlertTriangle, Bell, Check, Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications as useServerNotifications } from "@/hooks/useNotifications";
import { useNotifications as useLocalNotifications } from "@/contexts/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function NotificationTray({ className }: { className?: string } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    allNotifications,
    acknowledgeNotification,
    notificationSyncError,
  } = useServerNotifications();
  const { notifications: localNotifications, markAsRead, clearNotifications } = useLocalNotifications();
  const [desktopPermission, setDesktopPermission] = useState(
    typeof Notification === "undefined" ? ("unsupported" as const) : Notification.permission,
  );
  const enableDesktopAlerts = async () => {
    if (typeof Notification === "undefined") return;
    try {
      setDesktopPermission(await Notification.requestPermission());
    } catch (error) {
      console.error("Failed to request desktop notification permission:", error);
    }
  };
  const { toast } = useToast();
  const serverEntries = allNotifications.map((notification) => ({
    id: notification.id,
    message: notification.message,
    time: notification.created_at,
    read: notification.read,
    jobOrderNumber: typeof notification.payload.job_order_number === "string"
      ? notification.payload.job_order_number
      : null,
    actionId: null,
    isHighPriority: notification.type === "high_priority_pending",
    source: "server" as const,
  }));
  const localEntries = localNotifications.map((notification) => ({
    id: notification.id,
    message: notification.message,
    time: notification.time,
    read: notification.read,
    jobOrderNumber: notification.jobOrderNumber || null,
    actionId: notification.actionId || null,
    isHighPriority: notification.type === "high_priority",
    source: "local" as const,
  }));
  const entries = [...serverEntries, ...localEntries]
    .sort((left, right) => right.time.localeCompare(left.time))
    .slice(0, 50);
  const unreadCount = entries.filter((notification) => !notification.read).length;

  const markServerRead = async (notificationId: string) => {
    try {
      await acknowledgeNotification(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast({
        title: "Could not update notification",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          className={cn("relative mx-auto h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -end-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-[min(24rem,calc(100vw-5rem))] p-0"
        aria-label="Notification tray"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">Notifications</h2>
            <p className="text-xs text-muted-foreground">
              {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {localNotifications.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearNotifications} className="h-7 px-2 text-xs">
              <Trash2 className="me-1 h-3 w-3" />Clear
            </Button>
          )}
        </div>
        {notificationSyncError && (
          <p role="status" className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
            Could not sync notifications. Your saved notifications are still available.
          </p>
        )}
        {entries.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <ScrollArea className="max-h-[min(70vh,32rem)]">
            <div className="divide-y">
              {entries.map((notification) => {
                return (
                  <div
                    key={notification.id}
                    className={`flex gap-3 px-4 py-3 ${notification.read ? "" : "bg-primary/5"}`}
                  >
                    <div className={`mt-0.5 rounded-full p-2 ${notification.isHighPriority ? "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
                      {notification.isHighPriority
                        ? <AlertTriangle className="h-4 w-4" />
                        : <Bell className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5">{notification.message}</p>
                      {notification.jobOrderNumber && (
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                          Job #{notification.jobOrderNumber}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.time), { addSuffix: true })}
                      </p>
                      {notification.actionId && (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 pt-1 text-xs"
                          onClick={() => {
                            markAsRead(notification.id);
                            window.dispatchEvent(new CustomEvent("workflow-alert-open", {
                              detail: { id: notification.actionId },
                            }));
                            setIsOpen(false);
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                    {!notification.read && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Mark notification as read"
                        onClick={() => {
                          if (notification.source === "local") {
                            markAsRead(notification.id);
                          } else {
                            void markServerRead(notification.id);
                          }
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        <div className="border-t p-3 text-xs text-muted-foreground">
          {desktopPermission === "default" && (
            <>
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={enableDesktopAlerts}>Enable desktop alerts</Button>
              <p className="mt-2">Show job updates when this tab is in the background.</p>
            </>
          )}
          {desktopPermission === "granted" && <p>Desktop alerts are enabled.</p>}
          {desktopPermission === "denied" && <p role="status">Desktop alerts are blocked. Allow notifications for this site in your browser settings, then reload.</p>}
          {desktopPermission === "unsupported" && <p role="status">Desktop alerts are not supported by this browser. In-app alerts still work while the portal is open.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
