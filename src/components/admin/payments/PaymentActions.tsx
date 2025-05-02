
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentActionsProps {
  onRefresh: () => void;
  onExport: () => void;
  isLoading?: boolean;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({ 
  onRefresh, 
  onExport, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="flex space-x-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={onRefresh}
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={onExport}
      >
        <FileDown className="h-4 w-4" />
        Export
      </Button>
    </div>
  );
};

export default PaymentActions;
