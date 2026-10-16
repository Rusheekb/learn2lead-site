import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, PenSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  messageKeys,
  useMessageablePairs,
  useMyThreads,
} from '@/hooks/queries/useMessagesQueries';
import Conversation from './Conversation';
import NewConversationDialog from './NewConversationDialog';
import ThreadList from './ThreadList';

const EMPTY_COPY: Record<string, { start: string; none: string }> = {
  student: {
    start: 'Message your tutor about classes, homework or scheduling.',
    none: 'Once you’re matched with a tutor, you can message them here.',
  },
  tutor: {
    start:
      'Message a student about classes and progress. If they have a parent on Learn2Lead, the parent sees the conversation too.',
    none: 'Once you’re matched with students, you can message them here.',
  },
  parent: {
    start:
      'Message your student’s tutor about classes, progress or scheduling.',
    none: 'Once your student is matched with a tutor, you can message them here.',
  },
  admin: {
    start: 'See and join any student–tutor conversation.',
    none: 'There are no active student–tutor matches yet.',
  },
};

/**
 * Messages, for every role (docs/family-accounts-plan.md, Phase D). One
 * conversation per student and tutor; the student's parent and Learn2Lead
 * staff can see it too. ?thread=<id> opens a conversation.
 */
const MessagesPage: React.FC = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('thread');
  const { data: threads = [], isLoading } = useMyThreads();
  const { data: pairs = [] } = useMessageablePairs();
  const [newOpen, setNewOpen] = useState(false);
  const selected = threads.find((t) => t.id === selectedId) ?? null;
  const copy = EMPTY_COPY[userRole ?? 'student'] ?? EMPTY_COPY.student;

  const select = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('thread', id);
    else next.delete('thread');
    setSearchParams(next);
  };

  const opened = async (id: string) => {
    await queryClient.invalidateQueries({
      queryKey: [...messageKeys.all, 'threads'],
    });
    select(id);
  };

  const newButton = pairs.length > 0 && (
    <Button size="sm" onClick={() => setNewOpen(true)}>
      <PenSquare className="mr-2 h-4 w-4" />
      New message
    </Button>
  );

  return (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <h2 className="text-lg font-bold sm:text-xl md:text-2xl">Messages</h2>
        {newButton}
      </div>

      {isLoading ? (
        <Card className="space-y-3 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : threads.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <MessageSquare
            className="mb-3 h-10 w-10 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-medium">No messages yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {pairs.length > 0 ? copy.start : copy.none}
          </p>
          {pairs.length > 0 && (
            <Button className="mt-4" onClick={() => setNewOpen(true)}>
              <PenSquare className="mr-2 h-4 w-4" />
              Write a message
            </Button>
          )}
        </Card>
      ) : (
        <Card className="grid h-[calc(100vh-13rem)] min-h-[440px] overflow-hidden md:grid-cols-[300px_1fr]">
          <div
            className={`min-h-0 border-r ${selected ? 'hidden md:block' : ''}`}
          >
            <ThreadList
              threads={threads}
              selectedId={selectedId}
              onSelect={select}
            />
          </div>
          <div className={`min-h-0 ${selected ? '' : 'hidden md:flex'}`}>
            {selected ? (
              <Conversation
                key={selected.id}
                thread={selected}
                onBack={() => select(null)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-6 text-sm text-muted-foreground">
                Choose a conversation to read it.
              </div>
            )}
          </div>
        </Card>
      )}

      <NewConversationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onOpened={opened}
      />
    </div>
  );
};

export default MessagesPage;
