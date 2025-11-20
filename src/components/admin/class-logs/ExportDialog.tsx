import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { downloadTestCSV } from '@/utils/csvTestData';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (startDate?: Date, endDate?: Date) => void;
  totalRecords: number;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  totalRecords,
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleExportAll = () => {
    onExport();
    onOpenChange(false);
  };

  const handleExportRange = () => {
    if (startDate && endDate) {
      onExport(startDate, endDate);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onOpenChange(false);
  };

  const isRangeValid = startDate && endDate && startDate <= endDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Class Logs</DialogTitle>
          <DialogDescription>
            Export all {totalRecords} filtered records or select a date range.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date (Optional)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date (Optional)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  disabled={(date) => (startDate ? date < startDate : false)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {startDate && endDate && startDate > endDate && (
            <p className="text-sm text-destructive">
              Start date must be before end date
            </p>
          )}
        </div>

        <div className="border-t pt-4 mt-2">
          <p className="text-sm text-muted-foreground mb-3">
            Need to test the import/export system?
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadTestCSV();
              onOpenChange(false);
            }}
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            Download Test CSV
          </Button>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportRange}
            disabled={!isRangeValid}
          >
            Export Date Range
          </Button>
          <Button onClick={handleExportAll}>
            Export All ({totalRecords})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
