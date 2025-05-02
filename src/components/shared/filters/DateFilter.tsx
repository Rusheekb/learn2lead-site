
import React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DateFilterProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  label?: string;
}

const DateFilter: React.FC<DateFilterProps> = ({
  date,
  setDate,
  className,
  label = 'Date filter'
}) => {
  const buttonId = React.useId();
  const formattedDate = date ? format(date, 'PPP') : 'Date';

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={buttonId}
            variant="outline"
            className={cn(
              'w-full justify-start text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue dark:focus-visible:ring-tutoring-teal',
              !date && 'text-muted-foreground'
            )}
            aria-label={date ? `Selected date: ${formattedDate}. Click to change date` : 'Select a date'}
          >
            <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            {formattedDate}
            <span className="sr-only">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" aria-labelledby={buttonId}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className="pointer-events-auto"
            aria-label="Calendar"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateFilter;
