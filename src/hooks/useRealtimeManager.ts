import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ClassEvent,
  Student,
  Tutor,
  ContentShareItem,
} from '@/types/tutorTypes';
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { Tables } from '@/integrations/supabase/types';

interface RealtimeManagerProps {
  userId?: string;
  userRole?: string;
  setClasses?: React.Dispatch<React.SetStateAction<ClassEvent[]>>;
  setStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
  setTutors?: React.Dispatch<React.SetStateAction<Tutor[]>>;
  setContentShares?: React.Dispatch<React.SetStateAction<ContentShareItem[]>>;
}

export const useRealtimeManager = ({
  userId,
  userRole,
  setClasses,
  setStudents,
  setTutors,
  setContentShares,
}: RealtimeManagerProps) => {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Clean up existing channels
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Create consolidated channels based on user role
    const channels: RealtimeChannel[] = [];

    // Classes subscription (for all users)
    if (setClasses) {
      const classChannel = supabase
        .channel('unified-classes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'class_logs' },
          (payload: RealtimePostgresChangesPayload<Tables<'class_logs'>>) => {
            handleClassLogUpdate(payload, setClasses);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'scheduled_classes' },
          (
            payload: RealtimePostgresChangesPayload<Tables<'scheduled_classes'>>
          ) => {
            handleScheduledClassUpdate(payload, setClasses);
          }
        )
        .subscribe();
      channels.push(classChannel);
    }

    // Admin-only subscriptions
    if (userRole === 'admin') {
      if (setStudents) {
        const studentChannel = supabase
          .channel('unified-students')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'students' },
            (payload: RealtimePostgresChangesPayload<Tables<'students'>>) => {
              handleStudentUpdate(payload, setStudents);
            }
          )
          .subscribe();
        channels.push(studentChannel);
      }

      if (setTutors) {
        const tutorChannel = supabase
          .channel('unified-tutors')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tutors' },
            (payload: RealtimePostgresChangesPayload<Tables<'tutors'>>) => {
              handleTutorUpdate(payload, setTutors);
            }
          )
          .subscribe();
        channels.push(tutorChannel);
      }
    }

    // Content shares (for tutors and students)
    if (setContentShares && (userRole === 'tutor' || userRole === 'student')) {
      const contentChannel = supabase
        .channel('unified-content')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'content_shares' },
          (
            payload: RealtimePostgresChangesPayload<Tables<'content_shares'>>
          ) => {
            handleContentShareUpdate(payload, setContentShares);
          }
        )
        .subscribe();
      channels.push(contentChannel);
    }

    channelsRef.current = channels;

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [userId, userRole, setClasses, setStudents, setTutors, setContentShares]);
};

// Handles scheduled_classes realtime events.
// DELETE fires for both class completion (RPC) and manual deletes — no toast either way;
// completion already shows its own success toast from classCompletion.ts.
const handleScheduledClassUpdate = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  setClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>
) => {
  const { eventType, new: newData, old: oldData } = payload;

  if (eventType === 'INSERT') {
    setClasses((prev) => [...prev, newData as unknown as ClassEvent]);
    toast.success('New class added');
  } else if (eventType === 'UPDATE') {
    const updated = newData as unknown as ClassEvent;
    setClasses((prev) =>
      prev.map((cls) => (cls.id === updated.id ? updated : cls))
    );
  } else if (eventType === 'DELETE') {
    const removed = oldData as unknown as ClassEvent;
    setClasses((prev) => prev.filter((cls) => cls.id !== removed.id));
  }
};

// Handles class_logs realtime events.
// No state mutation (setClasses holds scheduled classes; class_logs have a different shape)
// and no toasts (completion success is already notified by classCompletion.ts).
const handleClassLogUpdate = (
  _payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  _setClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>
) => {};

const handleStudentUpdate = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>
) => {
  const { eventType, new: newData, old: oldData } = payload;

  if (eventType === 'INSERT') {
    setStudents((prev) => [...prev, newData as unknown as Student]);
    toast.success('New student added');
  } else if (eventType === 'UPDATE') {
    const updated = newData as unknown as Student;
    setStudents((prev) =>
      prev.map((student) => (student.id === updated.id ? updated : student))
    );
  } else if (eventType === 'DELETE') {
    const removed = oldData as unknown as Student;
    setStudents((prev) => prev.filter((student) => student.id !== removed.id));
    toast.info('Student removed');
  }
};

const handleTutorUpdate = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  setTutors: React.Dispatch<React.SetStateAction<Tutor[]>>
) => {
  const { eventType, new: newData, old: oldData } = payload;

  if (eventType === 'INSERT') {
    setTutors((prev) => [...prev, newData as unknown as Tutor]);
    toast.success('New tutor added');
  } else if (eventType === 'UPDATE') {
    const updated = newData as unknown as Tutor;
    setTutors((prev) =>
      prev.map((tutor) => (tutor.id === updated.id ? updated : tutor))
    );
  } else if (eventType === 'DELETE') {
    const removed = oldData as unknown as Tutor;
    setTutors((prev) => prev.filter((tutor) => tutor.id !== removed.id));
    toast.info('Tutor removed');
  }
};

const handleContentShareUpdate = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  setContentShares: React.Dispatch<React.SetStateAction<ContentShareItem[]>>
) => {
  const { eventType, new: newData, old: oldData } = payload;

  if (eventType === 'INSERT') {
    setContentShares((prev) => [
      ...prev,
      newData as unknown as ContentShareItem,
    ]);
    toast.success('New content shared');
  } else if (eventType === 'UPDATE') {
    const updated = newData as unknown as ContentShareItem;
    setContentShares((prev) =>
      prev.map((share) => (share.id === updated.id ? updated : share))
    );
  } else if (eventType === 'DELETE') {
    const removed = oldData as unknown as ContentShareItem;
    setContentShares((prev) => prev.filter((share) => share.id !== removed.id));
    toast.info('Content share removed');
  }
};
