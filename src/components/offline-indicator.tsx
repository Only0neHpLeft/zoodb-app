import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOffline } from '@/contexts/offline-context';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export function OfflineIndicator() {
  const { isOnline, isSyncing, queuedCount, failedOperations, syncQueue } = useOffline();

  // Don't show anything if online and no pending operations
  if (isOnline && queuedCount === 0 && failedOperations.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="outline" className="flex items-center gap-1.5 border-yellow-600 text-yellow-600">
                <WifiOff className="h-3 w-3" />
                <span className="text-xs">Offline</span>
              </Badge>
            )}

            {isSyncing && (
              <Badge variant="outline" className="flex items-center gap-1.5 border-blue-600 text-blue-600">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="text-xs">Syncing...</span>
              </Badge>
            )}

            {queuedCount > 0 && !isSyncing && (
              <Badge variant="outline" className="flex items-center gap-1.5 border-blue-600 text-blue-600">
                <RefreshCw className="h-3 w-3" />
                <span className="text-xs">{queuedCount} pending</span>
              </Badge>
            )}

            {failedOperations.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1.5 border-red-600 text-red-600">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">{failedOperations.length} failed</span>
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            {!isOnline && <p>You are offline. Changes will sync when you reconnect.</p>}
            {queuedCount > 0 && <p>{queuedCount} operation(s) waiting to sync</p>}
            {failedOperations.length > 0 && (
              <>
                <p>{failedOperations.length} operation(s) failed after 5 retries</p>
                <p className="text-xs text-muted-foreground">Go to Settings to view details</p>
              </>
            )}
            {isOnline && queuedCount > 0 && !isSyncing && (
              <Button
                size="sm"
                variant="outline"
                onClick={syncQueue}
                className="w-full mt-2"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry Sync
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
