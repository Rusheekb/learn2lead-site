
import { useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { TransformedClassLog } from '@/services/logs/types';

export function useDataTransformations(
  classList: any[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>
) {
  // Handle transformation of class logs to class events
  useEffect(() => {
    if (classList && classList.length > 0) {
      // Convert TransformedClassLog to ClassEvent if needed
      const convertedClasses = classList.map((cls: TransformedClassLog | ClassEvent) => {
        if ('additionalInfo' in cls) { // It's a TransformedClassLog
          return {
            ...cls,
            title: cls.title || cls.classNumber || '',
            status: cls.additionalInfo?.includes('Status:') 
              ? cls.additionalInfo.split('Status:')[1].trim().split(' ')[0] as any
              : 'pending',
            attendance: cls.additionalInfo?.includes('Attendance:')
              ? cls.additionalInfo.split('Attendance:')[1].trim().split(' ')[0] as any
              : 'pending',
            zoomLink: cls.zoomLink || null,
            recurring: false,
            materials: [],
          } as ClassEvent;
        }
        return cls; // It's already a ClassEvent
      });
      
      setScheduledClasses(convertedClasses);
    }
  }, [classList, setScheduledClasses]);

  return {};
}
