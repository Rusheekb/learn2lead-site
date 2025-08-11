import { ClassItem, StudentMessage, StudentUpload } from '@/types/classTypes';
import { useClassSubscription } from './subscriptions/useClassSubscription';

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
  // Message subscription removed - messaging functionality disabled
  const uploadsChannel = useUploadSubscription(
    currentStudentName,
    setStudentUploads
  );

  // Use cleanup hook for remaining channels
  useRealtimeCleanup([classesChannel, uploadsChannel]);
};

export default useStudentRealtime;
