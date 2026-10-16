import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const log = logger.create('messagesMutations');

/** Open (or start) the conversation for a student and tutor. */
export async function openThread(
  studentId: string,
  tutorId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_thread', {
    p_student_id: studentId,
    p_tutor_id: tutorId,
  });
  if (error || !data) {
    log.error('Could not open conversation', error);
    throw new Error('Could not open this conversation.');
  }
  return data;
}

/**
 * Send a message. Goes through the send-message function so the other
 * people in the conversation are alerted by their chosen channels.
 */
export async function sendMessage(
  threadId: string,
  body: string
): Promise<string> {
  const fallback = 'Your message could not be sent. Please try again.';
  const { data, error } = await supabase.functions.invoke('send-message', {
    body: { thread_id: threadId, body },
  });
  if (error) {
    let message = fallback;
    try {
      const errorBody = await (
        error as { context?: { json?: () => Promise<{ error?: string }> } }
      ).context?.json?.();
      if (errorBody?.error) message = errorBody.error;
    } catch {
      // Keep the fallback if the body can't be read
    }
    log.error('send-message failed', error);
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || fallback);
  return data.id as string;
}

export async function markThreadRead(threadId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_thread_read', {
    p_thread_id: threadId,
  });
  if (error) log.error('Could not mark conversation read', error);
}
