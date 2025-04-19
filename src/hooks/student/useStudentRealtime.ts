
import { ClassItem, StudentMessage, StudentUpload } from '@/types/classTypes';
import { useClassSubscription } from './subscriptions/useClassSubscription';
import { useMessageSubscription } from './subscriptions/useMessageSubscription';
import { useUploadSubscription } from './subscriptions/useUploadSubscription';
import { useRealtimeCleanup } from './useRealtimeCleanup';

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
  
  // Use cleanup hook for all channels
  useRealtimeCleanup([classesChannel, messagesChannel, uploadsChannel]);
};

export default useStudentRealtime;

