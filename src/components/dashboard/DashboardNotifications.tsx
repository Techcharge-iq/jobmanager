import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Trash2, AlertTriangle } from "lucide-react";
import { useNotifications, AppNotification } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

interface DashboardNotificationsProps {
  notifications?: AppNotification[];
  onNotificationClick?: (id: string) => void;
}

export function DashboardNotifications({ notifications: propNotifications, onNotificationClick }: DashboardNotificationsProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" as const : Notification.permission,
  );
  const { notifications: contextNotifications, markAsRead, clearNotifications } = useNotifications();

  const notifications = propNotifications || contextNotifications;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    onNotificationClick?.(id);
  };

  const enableDesktopNotifications = async () => {
    if (typeof Notification === "undefined") return;
    try {
      const permission = await Notification.requestPermission();
      setDesktopPermission(permission);
    } catch (error) {
      console.error("Failed to request desktop notification permission:", error);
    }
  };

  const toggleNotifications = () => {
    if (typeof Notification !== "undefined") {
      setDesktopPermission(Notification.permission);
    }
    setShowNotifications((isOpen) => !isOpen);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleNotifications}
        aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ""}`}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -end-1 text-xs rounded-full w-5 h-5 flex items-center justify-center bg-destructive text-destructive-foreground">
            {unreadNotifications}
          </span>
        )}
      </Button>
      {showNotifications && (
        <div className="absolute end-0 top-full mt-2 w-80 rounded-md border bg-popover text-popover-foreground shadow-lg z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="h-7 px-2 text-xs"
              >
                <Trash2 className="w-3 h-3 me-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 border-b cursor-pointer hover:bg-muted/50",
                    !notification.read && "bg-muted/30"
                  )}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    {notification.type === 'high_priority' && (
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{notification.message}</p>
                      <time
                        className="text-xs text-muted-foreground mt-1 block"
                        dateTime={notification.time}
                      >
                        Since {new Date(notification.time).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {desktopPermission === "default" && (
            <div className="border-t p-3">
              <Button variant="outline" size="sm" className="w-full" onClick={enableDesktopNotifications}>
                Enable desktop alerts
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Show job updates when this tab is in the background.
              </p>
            </div>
          )}
          {desktopPermission === "granted" && (
            <p className="border-t p-3 text-xs text-muted-foreground">Desktop alerts are enabled.</p>
          )}
          {desktopPermission === "denied" && (
            <p role="status" className="border-t p-3 text-xs text-muted-foreground">
              Desktop alerts are blocked. Allow notifications for this site in your browser settings, then reload.
            </p>
          )}
          {desktopPermission === "unsupported" && (
            <p role="status" className="border-t p-3 text-xs text-muted-foreground">
              Desktop alerts are not supported by this browser. In-app alerts still work while the portal is open.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
