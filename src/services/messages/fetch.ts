import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  MessageablePair,
  MessageThread,
  ThreadMessage,
  ThreadParticipant,
  ThreadRole,
} from './types';

const log = logger.create('messagesFetch');

export async function fetchMyThreads(): Promise<MessageThread[]> {
  const { data, error } = await supabase.rpc('get_my_threads');
  if (error) {
    log.error('Error fetching conversations', error);
    throw error;
  }
  return (data ?? []).map((t) => ({
    id: t.thread_id,
    studentId: t.student_id,
    studentName: t.student_name,
    tutorId: t.tutor_id,
    tutorName: t.tutor_name,
    lastMessageAt: t.last_message_at,
    preview: t.last_message_preview,
    lastSenderName: t.last_sender_name,
    unread: Number(t.unread_count ?? 0),
    canPost: !!t.can_post,
    myRole: t.my_role as ThreadRole,
  }));
}

export async function fetchThreadMessages(
  threadId: string
): Promise<ThreadMessage[]> {
  const { data, error } = await supabase.rpc('get_thread_messages', {
    p_thread_id: threadId,
  });
  if (error) {
    log.error('Error fetching messages', error);
    throw error;
  }
  return (data ?? []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    senderName: m.sender_name,
    senderRole: m.sender_role as ThreadRole,
    body: m.body,
    createdAt: m.created_at,
  }));
}

export async function fetchThreadParticipants(
  threadId: string
): Promise<ThreadParticipant[]> {
  const { data, error } = await supabase.rpc('get_thread_participants', {
    p_thread_id: threadId,
  });
  if (error) {
    log.error('Error fetching participants', error);
    throw error;
  }
  return (data ?? []).map((p) => ({
    profileId: p.profile_id,
    name: p.name,
    role: p.role as ThreadRole,
  }));
}

export async function fetchMessageablePairs(): Promise<MessageablePair[]> {
  const { data, error } = await supabase.rpc('get_messageable_pairs');
  if (error) {
    log.error('Error fetching who can be messaged', error);
    throw error;
  }
  return (data ?? []).map((p) => ({
    studentId: p.student_id,
    studentName: p.student_name,
    tutorId: p.tutor_id,
    tutorName: p.tutor_name,
  }));
}

export async function fetchUnreadMessageCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_message_count');
  if (error) {
    log.error('Error fetching unread count', error);
    throw error;
  }
  return Number(data ?? 0);
}
