
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchStudentAnalytics, fetchTutorAnalytics } from '@/services/analyticsService';
import { Student, Tutor } from '@/types/tutorTypes';

type User = (Student | Tutor) & { role: 'student' | 'tutor' };

interface Props {
  user: User | null;
  onClose: () => void;
}

export function UserDetailModal({ user, onClose }: Props) {
  const [stats, setStats] = useState<{ totalSessions: number; avgDuration: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fn = user.role === 'student' ? fetchStudentAnalytics : fetchTutorAnalytics;
    fn(user.id).then(setStats).catch(console.error);
  }, [user]);

  if (!user) return null;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user.email} • {user.role}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-2"><strong>Name:</strong> {user.name || '—'}</p>
          <p className="mb-2"><strong>User ID:</strong> {user.id}</p>
          <hr className="my-4" />
          <p className="mb-2">
            <strong>Total Sessions:</strong> {stats?.totalSessions ?? 'Loading...'}
          </p>
          <p className="mb-2">
            <strong>Avg. Duration:</strong> {stats?.avgDuration ?? 'Loading...'} mins
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
