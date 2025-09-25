import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClassEvent, Student, Tutor, ContentShareItem } from '@/types/tutorTypes';
import { RealtimeChannel } from '@supabase/supabase-js';

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
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Create consolidated channels based on user role
    const channels: RealtimeChannel[] = [];

    // Classes subscription (for all users)
    if (setClasses) {
      const classChannel = supabase
        .channel('unified-classes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'class_logs' }, (payload) => {
          handleClassUpdate(payload, setClasses);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_classes' }, (payload) => {
          handleClassUpdate(payload, setClasses);
        })
        .subscribe();
      channels.push(classChannel);
    }

    // Admin-only subscriptions
    if (userRole === 'admin') {
      if (setStudents) {
        const studentChannel = supabase
          .channel('unified-students')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
            handleStudentUpdate(payload, setStudents);
          })
          .subscribe();
        channels.push(studentChannel);
      }

      if (setTutors) {
        const tutorChannel = supabase
          .channel('unified-tutors')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tutors' }, (payload) => {
            handleTutorUpdate(payload, setTutors);
          })
          .subscribe();
        channels.push(tutorChannel);
      }
    }

    // Content shares (for tutors and students)
    if (setContentShares && (userRole === 'tutor' || userRole === 'student')) {
      const contentChannel = supabase
        .channel('unified-content')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'content_shares' }, (payload) => {
          handleContentShareUpdate(payload, setContentShares);
        })
        .subscribe();
      channels.push(contentChannel);
    }

    channelsRef.current = channels;

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [userId, userRole, setClasses, setStudents, setTutors, setContentShares]);
};

const handleClassUpdate = (payload: any, setClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>) => {
  const { eventType, new: newData, old: oldData } = payload;
  
  if (eventType === 'INSERT') {
    setClasses(prev => [...prev, newData as ClassEvent]);
    toast.success('New class added');
  } else if (eventType === 'UPDATE') {
    setClasses(prev => prev.map(cls => cls.id === newData.id ? newData as ClassEvent : cls));
  } else if (eventType === 'DELETE') {
    setClasses(prev => prev.filter(cls => cls.id !== oldData.id));
    toast.info('Class removed');
  }
};

const handleStudentUpdate = (payload: any, setStudents: React.Dispatch<React.SetStateAction<Student[]>>) => {
  const { eventType, new: newData, old: oldData } = payload;
  
  if (eventType === 'INSERT') {
    setStudents(prev => [...prev, newData as Student]);
    toast.success('New student added');
  } else if (eventType === 'UPDATE') {
    setStudents(prev => prev.map(student => student.id === newData.id ? newData as Student : student));
  } else if (eventType === 'DELETE') {
    setStudents(prev => prev.filter(student => student.id !== oldData.id));
    toast.info('Student removed');
  }
};

const handleTutorUpdate = (payload: any, setTutors: React.Dispatch<React.SetStateAction<Tutor[]>>) => {
  const { eventType, new: newData, old: oldData } = payload;
  
  if (eventType === 'INSERT') {
    setTutors(prev => [...prev, newData as Tutor]);
    toast.success('New tutor added');
  } else if (eventType === 'UPDATE') {
    setTutors(prev => prev.map(tutor => tutor.id === newData.id ? newData as Tutor : tutor));
  } else if (eventType === 'DELETE') {
    setTutors(prev => prev.filter(tutor => tutor.id !== oldData.id));
    toast.info('Tutor removed');
  }
};

const handleContentShareUpdate = (payload: any, setContentShares: React.Dispatch<React.SetStateAction<ContentShareItem[]>>) => {
  const { eventType, new: newData, old: oldData } = payload;
  
  if (eventType === 'INSERT') {
    setContentShares(prev => [...prev, newData as ContentShareItem]);
    toast.success('New content shared');
  } else if (eventType === 'UPDATE') {
    setContentShares(prev => prev.map(share => share.id === newData.id ? newData as ContentShareItem : share));
  } else if (eventType === 'DELETE') {
    setContentShares(prev => prev.filter(share => share.id !== oldData.id));
    toast.info('Content share removed');
  }
};