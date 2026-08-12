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
            void handleScheduledClassUpdate(payload, setClasses);
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

// postgres_changes payloads carry the raw table row (snake_case columns,
// no joined student/tutor names) — never assignable to ClassEvent directly.
// Re-fetch and map the single row the same way the initial list query does,
// so realtime-driven updates render identically to a normal refetch.
const fetchAndMapScheduledClass = async (
  id: string
): Promise<ClassEvent | null> => {
  const { data: record, error } = await supabase
    .from('scheduled_classes')
    .select(
      `
      *,
      student:profiles!scheduled_classes_student_id_fkey(first_name, last_name, email),
      tutor:profiles!scheduled_classes_tutor_id_fkey(first_name, last_name, email)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !record) return null;

  const student = (record as any).student || {};
  const tutor = (record as any).tutor || {};

  const studentName =
    student.first_name || student.last_name
      ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
      : student.email || 'Unknown Student';

  const tutorName =
    tutor.first_name || tutor.last_name
      ? `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim()
      : tutor.email || 'Unknown Tutor';

  return {
    id: record.id,
    title: record.title,
    date: record.date,
    startTime: record.start_time?.substring(0, 5) || '00:00',
    endTime: record.end_time?.substring(0, 5) || '00:00',
    subject: record.subject || '',
    studentId: record.student_id,
    studentName,
    tutorId: record.tutor_id,
    tutorName,
    zoomLink: record.zoom_link,
    notes: record.notes,
    status: record.status,
    attendance: record.attendance,
    materialsUrl: record.materials_url || [],
    relationshipId: record.relationship_id,
  } as unknown as ClassEvent;
};

// Handles scheduled_classes realtime events.
// DELETE fires for both class completion (RPC) and manual deletes — no toast either way;
// completion already shows its own success toast from classCompletion.ts.
const handleScheduledClassUpdate = async (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  setClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>
) => {
  const { eventType, new: newData, old: oldData } = payload;

  if (eventType === 'INSERT') {
    const id = (newData as { id?: string })?.id;
    if (!id) return;
    const mapped = await fetchAndMapScheduledClass(id);
    if (!mapped) return;
    // Upsert by id — the direct-action refetch that already ran for a
    // self-triggered create can beat or lose the race against this event.
    setClasses((prev) =>
      prev.some((cls) => cls.id === mapped.id)
        ? prev.map((cls) => (cls.id === mapped.id ? mapped : cls))
        : [...prev, mapped]
    );
    toast.success('New class added');
  } else if (eventType === 'UPDATE') {
    const id = (newData as { id?: string })?.id;
    if (!id) return;
    const mapped = await fetchAndMapScheduledClass(id);
    if (!mapped) return;
    setClasses((prev) =>
      prev.map((cls) => (cls.id === mapped.id ? mapped : cls))
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
