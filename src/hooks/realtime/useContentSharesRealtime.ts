
import { useEffect } from 'react';
import { ContentShareItem } from '@/types/sharedTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useContentSharesRealtime(
  setShares: React.Dispatch<React.SetStateAction<ContentShareItem[]>>
) {
  useEffect(() => {
    const channel = supabase
      .channel('content-shares-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_shares',
        },
        (payload) => {
          setShares((prevShares) => [
            ...prevShares,
            payload.new as ContentShareItem,
          ]);
          toast.success('New content shared');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_shares',
        },
        (payload) => {
          setShares((prevShares) =>
            prevShares.map((share) =>
              share.id === payload.new.id
                ? (payload.new as ContentShareItem)
                : share
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'content_shares',
        },
        (payload) => {
          setShares((prevShares) =>
            prevShares.filter((share) => share.id !== payload.old.id)
          );
          toast.info('Content share removed');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setShares]);
}
