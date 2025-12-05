import React, { useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PauseCircle, AlertTriangle } from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PauseSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const PauseSubscriptionDialog: React.FC<PauseSubscriptionDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [resumeDate, setResumeDate] = useState<Date | undefined>(
    addDays(new Date(), 14) // Default to 2 weeks
  );
  const [isLoading, setIsLoading] = useState(false);

  const minDate = addDays(new Date(), 1);
  const maxDate = addMonths(new Date(), 3); // 90 days max

  const handlePause = async () => {
    if (!resumeDate) {
      toast.error('Please select a resume date');
      return;
    }

    try {
      setIsLoading(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please log in to pause your subscription');
        return;
      }

      const { data, error } = await supabase.functions.invoke('pause-subscription', {
        body: {
          action: 'pause',
          resumeDate: resumeDate.toISOString(),
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to pause subscription');
      }

      toast.success('Subscription paused successfully');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error pausing subscription:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to pause subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-orange-500" />
            Pause Subscription
          </DialogTitle>
          <DialogDescription>
            Take a break from your subscription. No charges will occur while paused.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-700 dark:text-orange-400">
                <p className="font-medium mb-1">What happens when you pause:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Billing is paused until the resume date</li>
                  <li>Your remaining credits are preserved</li>
                  <li>You can still view your class history</li>
                  <li>Maximum pause duration is 90 days</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resume Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !resumeDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {resumeDate ? format(resumeDate, 'PPP') : 'Select resume date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={resumeDate}
                  onSelect={setResumeDate}
                  disabled={(date) => date < minDate || date > maxDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Your subscription will automatically resume on this date.
            </p>
          </div>

          {resumeDate && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Billing resumes:</span>{' '}
                <span className="font-medium">{format(resumeDate, 'MMMM d, yyyy')}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePause}
            disabled={isLoading || !resumeDate}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? 'Pausing...' : 'Pause Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
