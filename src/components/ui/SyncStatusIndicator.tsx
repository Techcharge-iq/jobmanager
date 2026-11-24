import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { db } from '@/lib/dexieDb';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function SyncStatusIndicator({ className, showLabel = true }: SyncStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncInfo = useLiveQuery(async () => {
    try {
      const [localCount, meta] = await Promise.all([
        db.jobs.count(),
        db.syncMeta.get('main'),
      ]);
      return { localCount, lastSyncTime: meta?.lastSyncTime ?? null, hasError: false };
    } catch (error) {
      console.error('Error loading sync status:', error);
      return { localCount: 0, lastSyncTime: null, hasError: true };
    }
  }, []);
  const localCount = syncInfo?.localCount ?? 0;
  const lastSyncTime = syncInfo?.lastSyncTime ?? null;
  const syncState = (syncInfo?.hasError
    ? 'error'
    : lastSyncTime
      ? 'synced'
      : 'idle') as SyncState | 'syncing';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        color: 'text-amber-700 dark:text-amber-300',
        bgColor: 'bg-amber-50 dark:bg-amber-500/15',
        label: 'Offline',
        description: `Working offline with ${localCount} cached jobs`
      };
    }

    switch (syncState) {
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-blue-700 dark:text-blue-300',
          bgColor: 'bg-blue-50 dark:bg-blue-500/15',
          label: 'Syncing',
          description: 'Synchronizing with server...',
          animate: true
        };
      case 'synced':
        return {
          icon: CheckCircle2,
          color: 'text-green-700 dark:text-green-300',
          bgColor: 'bg-green-50 dark:bg-green-500/15',
          label: 'Synced',
          description: lastSyncTime 
            ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}`
            : 'Data is up to date'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-700 dark:text-red-300',
          bgColor: 'bg-red-50 dark:bg-red-500/15',
          label: 'Sync Error',
          description: 'Failed to sync. Working with cached data.'
        };
      default:
        return {
          icon: Database,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          label: 'Local',
          description: `${localCount} jobs in local cache`
        };
    }
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors',
            status.bgColor,
            className
          )}>
            <div className="relative">
              <Icon className={cn(
                'h-4 w-4',
                status.color,
                status.animate && 'animate-spin'
              )} />
              {isOnline && syncState === 'synced' && (
                <Cloud className="h-3 w-3 text-green-700 dark:text-green-300 absolute -top-1 -end-1" />
              )}
            </div>
            {showLabel && (
              <span className={cn('text-xs font-medium', status.color)}>
                {status.label}
              </span>
            )}
            <div className={cn(
              'flex items-center gap-1 text-xs',
              status.color
            )}>
              <Database className="h-3 w-3" />
              <span>{localCount}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{status.label}</p>
            <p className="text-xs text-muted-foreground">{status.description}</p>
            {localCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {localCount} jobs cached locally for offline access
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
