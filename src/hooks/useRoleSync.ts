
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createStudent, deleteStudent } from '@/services/students/studentService';
import { createTutor, deleteTutor } from '@/services/tutors/tutorService';

export function useRoleSync() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user;
        if (!user) return;
        
        // Only run on sign-in or metadata updates
        if (event !== 'SIGNED_IN' && event !== 'USER_UPDATED') return;

        console.log('Role sync - auth event:', event, 'user:', user);
        
        const { id, email, user_metadata } = user;
        const role = user_metadata.role as 'student' | 'tutor';

        try {
          if (role === 'student') {
            await createStudent({
              id,
              name: email?.split('@')[0] || 'New Student',
              email: email || '',
              subjects: [],
            });
            await deleteTutor(id);
          } else if (role === 'tutor') {
            await createTutor({
              id,
              name: email?.split('@')[0] || 'New Tutor',
              email: email || '',
              subjects: [],
              rating: 0,
              classes: 0,
              hourlyRate: 25,
            });
            await deleteStudent(id);
          }
        } catch (error) {
          console.error('Error syncing user role:', error);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
