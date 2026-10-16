import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMessageablePairs,
  fetchMyThreads,
  fetchThreadMessages,
  fetchThreadParticipants,
  fetchUnreadMessageCount,
} from '@/services/messages/fetch';

/**
 * Messages refresh by polling while the page is open (not in background
 * tabs): every 10s for the open conversation, 30s for the list, 60s for the
 * sidebar badge. Light enough for the free plan; no realtime channels.
 */
export const messageKeys = {
  all: ['messages'] as const,
  threads: (userId: string) => [...messageKeys.all, 'threads', userId] as const,
  thread: (threadId: string) =>
    [...messageKeys.all, 'thread', threadId] as const,
  participants: (threadId: string) =>
    [...messageKeys.all, 'participants', threadId] as const,
  pairs: (userId: string) => [...messageKeys.all, 'pairs', userId] as const,
  unread: (userId: string) => [...messageKeys.all, 'unread', userId] as const,
};

export const useMyThreads = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: messageKeys.threads(user?.id ?? ''),
    queryFn: fetchMyThreads,
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });
};

export const useThreadMessages = (threadId: string | null) =>
  useQuery({
    queryKey: messageKeys.thread(threadId ?? ''),
    queryFn: () => fetchThreadMessages(threadId!),
    enabled: !!threadId,
    refetchInterval: 10_000,
  });

export const useThreadParticipants = (threadId: string | null) =>
  useQuery({
    queryKey: messageKeys.participants(threadId ?? ''),
    queryFn: () => fetchThreadParticipants(threadId!),
    enabled: !!threadId,
    staleTime: 5 * 60_000,
  });

export const useMessageablePairs = (enabled = true) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: messageKeys.pairs(user?.id ?? ''),
    queryFn: fetchMessageablePairs,
    enabled: !!user?.id && enabled,
  });
};

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: messageKeys.unread(user?.id ?? ''),
    queryFn: fetchUnreadMessageCount,
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });
};
