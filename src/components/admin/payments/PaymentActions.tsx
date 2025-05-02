
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileDown } from 'lucide-react';

interface PaymentActionsProps {
  onRefresh: () => void;
  onExport: () => void;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({ onRefresh, onExport }) => {
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
