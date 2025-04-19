
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StudentMessage, StudentUpload, ClassItem } from '@/types/classTypes';
import { useClassSubscription } from './useClassSubscription';
import { useMessageSubscription } from './useMessageSubscription';
import { useUploadSubscription } from './useUploadSubscription';

const useStudentRealtime = (
  currentStudentName: string,
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>,
  setStudentMessages: React.Dispatch<React.SetStateAction<StudentMessage[]>>,
  setStudentUploads: React.Dispatch<React.SetStateAction<StudentUpload[]>>
) => {
  // Use dedicated hooks for each subscription
  const classesChannel = useClassSubscription(currentStudentName, setClasses);
  const messagesChannel = useMessageSubscription(currentStudentName, setStudentMessages);
  const uploadsChannel = useUploadSubscription(currentStudentName, setStudentUploads);
  
  // Cleanup subscriptions when component unmounts
  useEffect(() => {
    return () => {
      supabase.removeChannel(classesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(uploadsChannel);
    };
  }, [classesChannel, messagesChannel, uploadsChannel]);
};

export default useStudentRealtime;
