import React, { useEffect, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { copyToClipboard } from '@/utils/clipboardUtils';
import {
  calendarSubscribeLinks,
  getChildCalendarFeedUrl,
  getMyCalendarFeedUrl,
  resetChildCalendarFeedUrl,
  resetMyCalendarFeedUrl,
} from '@/utils/calendarUtils';

interface CalendarFeedLinkProps {
  /** A parent showing one child's own feed instead of their own. */
  studentId?: string;
}

/**
 * The signed-in user's private calendar feed (or, for a parent, one child's):
 * the link, one-tap subscribe buttons, and a reset for when a link has been
 * shared by mistake.
 */
const CalendarFeedLink: React.FC<CalendarFeedLinkProps> = ({ studentId }) => {
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (studentId
      ? getChildCalendarFeedUrl(studentId)
      : getMyCalendarFeedUrl()
    ).then((url) => {
      if (cancelled) return;
      if (url) setFeedUrl(url);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const handleCopy = async () => {
    if (!feedUrl) return;
    if (await copyToClipboard(feedUrl)) toast.success('Calendar link copied');
    else toast.error('Please copy the link manually');
  };

  const handleReset = async () => {
    setIsResetting(true);
    const url = studentId
      ? await resetChildCalendarFeedUrl(studentId)
      : await resetMyCalendarFeedUrl();
    setIsResetting(false);
    setConfirmingReset(false);
    if (url) {
      setFeedUrl(url);
      toast.success(
        'New link created. Calendars using the old link will stop updating.'
      );
    } else {
      toast.error('Could not reset your calendar link');
    }
  };

  if (failed) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn't load your calendar link. Please refresh and try again.
      </p>
    );
  }
  if (!feedUrl) {
    return (
      <p className="text-sm text-muted-foreground">Loading your feed URL…</p>
    );
  }

  const links = calendarSubscribeLinks(feedUrl);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={feedUrl}
          readOnly
          aria-label="Calendar feed URL"
          className="flex-1 text-xs font-mono bg-muted"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label="Copy link"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <a href={links.google} target="_blank" rel="noopener noreferrer">
            Add to Google Calendar
          </a>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <a href={links.apple}>Add to Apple Calendar</a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {studentId
          ? 'This link is private — anyone who has it can see this student’s class schedule.'
          : 'This link is private to you — anyone who has it can see your class schedule.'}{' '}
        New and changed classes appear automatically (calendar apps refresh
        every few hours).
      </p>
      {confirmingReset ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span>
            Reset? Calendars using the current link will stop updating.
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting…' : 'Yes, reset'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmingReset(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => setConfirmingReset(true)}
        >
          <RefreshCw className="h-3 w-3" /> Reset link
        </button>
      )}
    </div>
  );
};

export default CalendarFeedLink;
