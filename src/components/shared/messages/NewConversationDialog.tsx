import React, { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageablePairs } from '@/hooks/queries/useMessagesQueries';
import { openThread } from '@/services/messages/mutations';
import { pairLabel } from './threadDisplay';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened: (threadId: string) => void;
}

/** Pick who to message: the people you're matched with. */
const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open,
  onOpenChange,
  onOpened,
}) => {
  const { userRole } = useAuth();
  const { data: pairs = [], isLoading } = useMessageablePairs(open);
  const [query, setQuery] = useState('');
  const [opening, setOpening] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const shown = q
    ? pairs.filter((p) =>
        `${p.studentName} ${p.tutorName}`.toLowerCase().includes(q)
      )
    : pairs;

  const choose = async (studentId: string, tutorId: string) => {
    const key = `${studentId}:${tutorId}`;
    setOpening(key);
    try {
      const id = await openThread(studentId, tutorId);
      onOpened(id);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not open conversation.'
      );
    } finally {
      setOpening(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            {userRole === 'tutor'
              ? 'Choose a student. Their parent, if they have one, will see the conversation too.'
              : userRole === 'admin'
                ? 'Choose a student and tutor to join their conversation.'
                : 'Choose who to message.'}
          </DialogDescription>
        </DialogHeader>
        {pairs.length > 8 && (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search"
              className="pl-8"
            />
          </div>
        )}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {pairs.length === 0
                ? 'There’s no one to message yet. You can message once a tutor match is in place.'
                : 'No matches.'}
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {shown.map((p) => {
                const key = `${p.studentId}:${p.tutorId}`;
                const label = pairLabel(p, userRole);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      disabled={opening !== null}
                      onClick={() => choose(p.studentId, p.tutorId)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent focus:outline-none focus-visible:bg-accent disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {label.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {label.detail}
                        </p>
                      </div>
                      {opening === key && (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
