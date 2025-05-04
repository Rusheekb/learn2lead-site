
import React from 'react';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/types/tutorTypes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getGoogleCalendarUrl, getOutlookCalendarUrl, downloadIcsFile } from '@/utils/calendarUtils';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarLinksProps {
  classEvent: ClassEvent;
  compact?: boolean;
  dropdownOnly?: boolean;
}

const CalendarLinks: React.FC<CalendarLinksProps> = ({
  classEvent,
  compact = false,
  dropdownOnly = false,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleDownloadIcs = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to download calendar events',
        variant: 'destructive',
      });
      return;
    }
    
    await downloadIcsFile(user.id, classEvent.title);
    toast({
      title: 'Calendar file downloaded',
      description: 'Import this .ics file into your calendar application',
    });
  };
  
  const googleUrl = getGoogleCalendarUrl(classEvent);
  const outlookUrl = getOutlookCalendarUrl(classEvent);
  
  const calendarDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size={compact ? "sm" : "default"}
          className="flex items-center"
        >
          <Calendar className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${compact ? 'mr-1' : 'mr-2'}`} />
          {!compact && "Add to Calendar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Add to Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Add to Outlook Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadIcs}>
          <Download className="h-4 w-4 mr-2" />
          Download .ics File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  
  if (dropdownOnly) {
    return calendarDropdown;
  }
  
  return (
    <div className={`flex ${compact ? 'gap-1' : 'gap-2'} items-center`}>
      {calendarDropdown}
      {!compact && (
        <>
          <Button variant="outline" size="sm" asChild>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Google
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Outlook
            </a>
          </Button>
        </>
      )}
    </div>
  );
};

export default CalendarLinks;
