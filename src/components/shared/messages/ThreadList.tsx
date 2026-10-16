import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MessageThread } from '@/services/messages/types';
import { listTime, threadSubtitle, threadTitle } from './threadDisplay';

interface ThreadListProps {
  threads: MessageThread[];
  selectedId: string | null;
  onSelect: (threadId: string) => void;
}

/** The signed-in person's conversations, newest first. */
const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedId,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? threads.filter((t) =>
        `${t.studentName} ${t.tutorName}`.toLowerCase().includes(q)
      )
    : threads;

  return (
    <div className="flex h-full flex-col">
      {threads.length > 8 && (
        <div className="relative border-b p-2">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            aria-label="Search conversations"
            className="h-9 pl-8"
          />
        </div>
      )}
      <ul className="flex-1 overflow-y-auto" aria-label="Conversations">
        {shown.map((t) => {
          const active = t.id === selectedId;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                aria-current={active ? 'true' : undefined}
                className={`w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent focus:outline-none focus-visible:bg-accent ${active ? 'bg-tutoring-lightBlue' : ''}`}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className={`truncate text-sm ${t.unread ? 'font-semibold' : 'font-medium'}`}
                  >
                    {threadTitle(t)}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {listTime(t.lastMessageAt)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className={`truncate text-xs ${t.unread ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {t.preview
                      ? `${t.lastSenderName ? `${t.lastSenderName.split(' ')[0]}: ` : ''}${t.preview}`
                      : threadSubtitle(t)}
                  </span>
                  {t.unread > 0 && (
                    <span className="ml-auto min-w-[1.25rem] shrink-0 rounded-full bg-tutoring-blue px-1.5 text-center text-[10px] font-semibold leading-4 text-white">
                      {t.unread}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No matches.</li>
        )}
      </ul>
    </div>
  );
};

export default ThreadList;
