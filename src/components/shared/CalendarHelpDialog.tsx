
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink, Download, HelpCircle, Copy } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboardUtils';
import { getUserCalendarFeedUrl } from '@/utils/calendarUtils';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarHelpDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CalendarHelpDialog: React.FC<CalendarHelpDialogProps> = ({
  isOpen,
  setIsOpen,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [feedUrl, setFeedUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && user?.id) {
      getUserCalendarFeedUrl(user.id).then((url) => {
        setFeedUrl(url);
      });
    }
  }, [isOpen, user?.id]);

  const handleCopyFeedUrl = async () => {
    if (!feedUrl) return;
    
    const success = await copyToClipboard(feedUrl);
    if (success) {
      toast({
        title: 'Feed URL copied',
        description: 'Calendar feed URL copied to clipboard',
      });
    } else {
      toast({
        title: 'Failed to copy URL',
        description: 'Please select and copy the URL manually',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Calendar Integration Help
          </DialogTitle>
          <DialogDescription>
            Learn how to integrate your scheduled classes with your preferred calendar app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Quick Add Options</h3>
            <p className="text-sm text-gray-500 mt-1">
              Each class has quick options to add it to your calendar:
            </p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <ExternalLink className="h-5 w-5 text-tutoring-blue mt-0.5" />
                <span>
                  <strong>Google Calendar:</strong> Adds a single event to your Google Calendar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ExternalLink className="h-5 w-5 text-tutoring-blue mt-0.5" />
                <span>
                  <strong>Outlook Calendar:</strong> Adds a single event to your Microsoft Outlook Calendar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="h-5 w-5 text-tutoring-blue mt-0.5" />
                <span>
                  <strong>Download .ics file:</strong> Downloads an event file you can import into any calendar app.
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium">Subscribe to All Classes</h3>
            <p className="text-sm text-gray-500 mt-1">
              To automatically sync all your classes (including future ones), subscribe to your personal calendar feed:
            </p>
            
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-md font-medium">Your Calendar Feed URL</h4>
                {feedUrl ? (
                  <div className="flex mt-2">
                    <Input
                      value={feedUrl}
                      readOnly
                      className="flex-1 text-xs font-mono"
                    />
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={handleCopyFeedUrl}
                      className="ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Loading your feed URL...</p>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Google Calendar</h4>
                  <ol className="text-sm list-decimal list-inside ml-2 space-y-1 mt-1">
                    <li>Go to <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer" className="text-tutoring-blue hover:underline">Google Calendar</a></li>
                    <li>Click on the "+" next to "Other calendars"</li>
                    <li>Select "From URL"</li>
                    <li>Paste your calendar feed URL</li>
                    <li>Click "Add calendar"</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium">Apple Calendar</h4>
                  <ol className="text-sm list-decimal list-inside ml-2 space-y-1 mt-1">
                    <li>Open Calendar app</li>
                    <li>Go to File {'>'}{'>'} New Calendar Subscription</li>
                    <li>Paste your calendar feed URL</li>
                    <li>Click "Subscribe"</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium">Outlook Calendar</h4>
                  <ol className="text-sm list-decimal list-inside ml-2 space-y-1 mt-1">
                    <li>Open Outlook</li>
                    <li>Go to Calendar view</li>
                    <li>Click "Add calendar" {'>'}{'>'} "Subscribe from web"</li>
                    <li>Paste your calendar feed URL</li>
                    <li>Click "Import"</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarHelpDialog;

// Add the Input component for the clipboard feature
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type || 'text'}
        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
