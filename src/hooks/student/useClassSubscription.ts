
import { supabase } from '@/integrations/supabase/client';
import { ClassItem } from '@/types/classTypes';
import { toast } from 'sonner';

export const useClassSubscription = (
  currentStudentName: string,
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>
) => {
  // Subscribe to class changes
  const classesChannel = supabase.channel('student-class-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'class_logs'
      },
      (payload: any) => {
        if (payload.new && payload.new.student_name === currentStudentName) {
          if (payload.eventType === 'INSERT') {
            const newClass: ClassItem = {
              id: payload.new.id,
              title: payload.new.title || '',
              subject: payload.new.subject || '',
              tutorName: payload.new.tutor_name || '',
              studentName: payload.new.student_name || '',
              date: payload.new.date || '',
              startTime: payload.new.start_time || '',
              endTime: payload.new.end_time || '',
              status: payload.new.status || 'upcoming',
              attendance: payload.new.attendance || 'pending',
              zoomLink: payload.new.zoom_link || '',
              notes: payload.new.notes || '',
              subjectId: payload.new.subject || '',
              recurring: false
            };
            
            setClasses(prevClasses => [...prevClasses, newClass]);
            toast.success(`New class added: ${newClass.title}`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedClass: ClassItem = {
              id: payload.new.id,
              title: payload.new.title || '',
              subject: payload.new.subject || '',
              tutorName: payload.new.tutor_name || '',
              studentName: payload.new.student_name || '',
              date: payload.new.date || '',
              startTime: payload.new.start_time || '',
              endTime: payload.new.end_time || '',
              status: payload.new.status || 'upcoming',
              attendance: payload.new.attendance || 'pending',
              zoomLink: payload.new.zoom_link || '',
              notes: payload.new.notes || '',
              subjectId: payload.new.subject || '',
              recurring: false
            };
            
            setClasses(prevClasses => 
              prevClasses.map(cls => cls.id === updatedClass.id ? updatedClass : cls)
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const classId = payload.old.id;
            setClasses(prevClasses => prevClasses.filter(cls => cls.id !== classId));
          }
        }
      }
    )
    .subscribe();
    
  return classesChannel;
};
