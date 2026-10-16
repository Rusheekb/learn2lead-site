import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Eye, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  messageKeys,
  useThreadMessages,
  useThreadParticipants,
} from '@/hooks/queries/useMessagesQueries';
import { markThreadRead, sendMessage } from '@/services/messages/mutations';
import type { MessageThread, ThreadMessage } from '@/services/messages/types';
import {
  dayLabel,
  MAX_MESSAGE_LENGTH,
  ROLE_LABEL,
  threadSubtitle,
  threadTitle,
  visibilityNote,
} from './threadDisplay';

interface ConversationProps {
  thread: MessageThread;
  /** Small screens: back to the list. */
  onBack?: () => void;
}

/** A new sender, a new day, or a 5-minute gap starts a new group. */
const startsGroup = (m: ThreadMessage, prev?: ThreadMessage) =>
  !prev ||
  prev.senderId !== m.senderId ||
  dayLabel(prev.createdAt) !== dayLabel(m.createdAt) ||
  new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() >
    5 * 60_000;

const Conversation: React.FC<ConversationProps> = ({ thread, onBack }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useThreadMessages(thread.id);
  const { data: participants = [] } = useThreadParticipants(thread.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;

  const refreshLists = () => {
    queryClient.invalidateQueries({
      queryKey: [...messageKeys.all, 'threads'],
    });
    queryClient.invalidateQueries({ queryKey: [...messageKeys.all, 'unread'] });
  };

  // Opening a conversation (and each new message while open) marks it read.
  useEffect(() => {
    if (!lastId) return;
    markThreadRead(thread.id).then(refreshLists);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id, lastId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.id, lastId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendMessage(thread.id, body);
      setDraft('');
      await queryClient.invalidateQueries({
        queryKey: messageKeys.thread(thread.id),
      });
      refreshLists();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Your message could not be sent.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-2 border-b px-4 py-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-8 w-8 shrink-0 md:hidden"
            onClick={onBack}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">
            {threadTitle(thread)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {threadSubtitle(thread)}
          </p>
          {participants.length > 0 && (
            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <Eye className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{visibilityNote(participants, user?.id)}</span>
            </p>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const mine = m.senderId === user?.id;
            const newDay =
              !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const header = startsGroup(m, prev);
            return (
              <React.Fragment key={m.id}>
                {newDay && (
                  <div className="py-2 text-center text-xs font-medium text-muted-foreground">
                    {dayLabel(m.createdAt)}
                  </div>
                )}
                <div
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${header ? 'pt-2' : ''}`}
                >
                  {header && (
                    <p className="mb-1 px-1 text-xs text-muted-foreground">
                      {mine ? (
                        'You'
                      ) : (
                        <>
                          <span className="font-medium text-foreground">
                            {m.senderName}
                          </span>
                          {` · ${ROLE_LABEL[m.senderRole] ?? ''}`}
                        </>
                      )}
                      {` · ${format(new Date(m.createdAt), 'h:mm a')}`}
                    </p>
                  )}
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-tutoring-blue text-white' : 'bg-muted text-foreground'}`}
                  >
                    {m.body}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {thread.canPost ? (
        <form
          className="border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message…"
              aria-label="Message"
              maxLength={MAX_MESSAGE_LENGTH}
              rows={2}
              className="min-h-[44px] resize-none"
            />
            <Button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Enter to send · Shift+Enter for a new line
            {draft.length > MAX_MESSAGE_LENGTH - 500 &&
              ` · ${draft.length}/${MAX_MESSAGE_LENGTH}`}
          </p>
        </form>
      ) : (
        <p className="border-t bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This conversation is closed because {thread.tutorName} is no longer
          matched with {thread.studentName.split(' ')[0]}. Past messages stay
          here.
        </p>
      )}
    </div>
  );
};

export default Conversation;
