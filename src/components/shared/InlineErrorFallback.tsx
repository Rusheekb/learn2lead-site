import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface InlineErrorFallbackProps {
  onRetry?: () => void;
  message?: string;
}

const InlineErrorFallback: React.FC<InlineErrorFallbackProps> = ({
  onRetry,
  message = "This section couldn't load",
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
};

export default InlineErrorFallback;
