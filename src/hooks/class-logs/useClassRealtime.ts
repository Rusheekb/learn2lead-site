
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentMessage } from '@/types/classTypes';

import { toast } from 'sonner';

type ClassItemDispatch = React.Dispatch<React.SetStateAction<ClassEvent[]>>;
type SelectedClassDispatch = React.Dispatch<React.SetStateAction<ClassEvent | null>>;
type IsDetailsOpenDispatch = React.Dispatch<React.SetStateAction<boolean>>;
type StudentMessagesDispatch = React.Dispatch<React.SetStateAction<StudentMessage[]>>;

/**
 * Hook to setup realtime subscriptions for class logs
 */
const useClassRealtime = (
  classes: ClassEvent[],
  setClasses: ClassItemDispatch,
  selectedClass: ClassEvent | null,
  setSelectedClass: SelectedClassDispatch,
  setIsDetailsOpen: IsDetailsOpenDispatch,
  studentMessages: StudentMessage[] = [],
  setStudentMessages?: StudentMessagesDispatch
) => {
  // Subscribe to changes in database
  useEffect(() => {
    // Only set up subscription if we have the set function
    if (!setStudentMessages) return;

    // Set up the realtime subscription
    console.log('Setting up realtime subscriptions for class logs');

    const classChannel = supabase
      .channel('class-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_logs',
        },
        (payload) => {
          console.log('Realtime update received for class logs:', payload);

          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            const newClass = payload.new as ClassEvent;
            console.log('New class added:', newClass);

            setClasses((prev) => [...prev, newClass]);
            toast.success(`New class "${newClass.title}" has been added`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedClass = payload.new as ClassEvent;
            console.log('Class updated:', updatedClass);

            setClasses((prev) =>
              prev.map((cls) =>
                cls.id === updatedClass.id ? updatedClass : cls
              )
            );

            // If this is the currently selected class, update it
            if (selectedClass && selectedClass.id === updatedClass.id) {
              setSelectedClass(updatedClass);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedClass = payload.old as ClassEvent;
            console.log('Class deleted:', deletedClass);

            setClasses((prev) => prev.filter((cls) => cls.id !== deletedClass.id));

            // If this is the currently selected class, close the details panel
            if (selectedClass && selectedClass.id === deletedClass.id) {
              setSelectedClass(null);
              setIsDetailsOpen(false);
            }
          }
        }
      )
      .subscribe();

    // Message subscription removed - messaging functionality disabled

    // Clean up subscriptions
    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(classChannel);
    };
  }, [classes, selectedClass, setClasses, setSelectedClass, setIsDetailsOpen, setStudentMessages]);

  return null;
};

export default useClassRealtime;
