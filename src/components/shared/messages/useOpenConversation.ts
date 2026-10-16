import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { messageKeys } from '@/hooks/queries/useMessagesQueries';
import { openThread } from '@/services/messages/mutations';

/**
 * Jump straight into the conversation for a student and tutor (e.g. a
 * "Message" button on a student's page). basePath is the reader's dashboard.
 */
export function useOpenConversation(basePath: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opening, setOpening] = useState(false);

  const open = async (studentId: string, tutorId: string) => {
    setOpening(true);
    try {
      const id = await openThread(studentId, tutorId);
      await queryClient.invalidateQueries({
        queryKey: [...messageKeys.all, 'threads'],
      });
      navigate(`${basePath}?tab=messages&thread=${encodeURIComponent(id)}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not open conversation.'
      );
    } finally {
      setOpening(false);
    }
  };

  return { open, opening };
}
