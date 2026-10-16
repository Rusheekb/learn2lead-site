import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { familyKeys } from '@/hooks/queries/useFamilyQueries';
import { setStudentHoursVisible } from '@/services/family/mutations';
import { ArrowLeft, Mail, MessageSquare, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassCalendarContainer } from '@/components/student/ClassCalendarContainer';
import CalendarFeedLink from '@/components/shared/CalendarFeedLink';
import { useMyChildren } from '@/hooks/queries/useFamilyQueries';
import ChildClassHistory from './ChildClassHistory';
import StudentLoginCard from './StudentLoginCard';
import ChildFormDialog from './ChildFormDialog';
import { useMessageablePairs } from '@/hooks/queries/useMessagesQueries';
import { useOpenConversation } from '@/components/shared/messages/useOpenConversation';

interface ChildDetailProps {
  studentId: string;
}

/** One student's schedule, class notes and calendar link. */
const ChildDetail: React.FC<ChildDetailProps> = ({ studentId }) => {
  const { data: children, isLoading } = useMyChildren();
  const [editOpen, setEditOpen] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const queryClient = useQueryClient();
  const child = children?.find((c) => c.studentId === studentId);
  const { data: pairs = [] } = useMessageablePairs();
  const tutors = pairs.filter((p) => p.studentId === studentId);
  const { open: openConversation, opening } = useOpenConversation('/family');

  const handleHoursVisible = async (visible: boolean) => {
    setSavingVisibility(true);
    try {
      await setStudentHoursVisible(studentId, visible);
      await queryClient.invalidateQueries({ queryKey: familyKeys.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSavingVisibility(false);
    }
  };

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to="/family">
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
        Family
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="space-y-4 py-4">
        {back}
        <p className="text-sm text-muted-foreground">
          This student isn’t part of your family account.
        </p>
      </div>
    );
  }

  const name = `${child.firstName} ${child.lastName}`.trim();

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        {back}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{name}</h2>
            <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3">
              {child.grade && <span>Grade {child.grade}</span>}
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {child.email
                  ? `Class emails also go to ${child.email}`
                  : 'Class emails go to you'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tutors.map((t) => (
              <Button
                key={t.tutorId}
                size="sm"
                variant="outline"
                disabled={opening}
                onClick={() => openConversation(t.studentId, t.tutorId)}
              >
                <MessageSquare className="h-4 w-4 mr-1" aria-hidden="true" />
                Message {t.tutorName.split(' ')[0]}
              </Button>
            ))}
            {child.managed && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" aria-hidden="true" />
                Edit details
              </Button>
            )}
          </div>
        </div>
      </div>

      <section aria-label={`${name}'s schedule`}>
        <h3 className="text-base font-semibold mb-3">Schedule</h3>
        <ClassCalendarContainer studentId={child.studentId} />
      </section>

      <ChildClassHistory studentId={child.studentId} />

      <StudentLoginCard child={child} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium" id="hours-visible-label">
                Show {child.firstName} the hours remaining
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {child.firstName} never sees prices, payments or your card —
                only how many hours are left, if you allow it.
              </p>
            </div>
            <Switch
              checked={child.hoursVisible}
              onCheckedChange={handleHoursVisible}
              disabled={savingVisibility}
              aria-labelledby="hours-visible-label"
            />
          </div>
        </CardContent>
      </Card>

      {child.managed && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {child.firstName}’s calendar link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add this to {child.firstName}’s own phone or tablet so their
              classes and Zoom links show up in their calendar. Your own
              calendar link (in Settings) already includes every student.
            </p>
            <CalendarFeedLink studentId={child.studentId} />
          </CardContent>
        </Card>
      )}

      <ChildFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        child={child}
      />
    </div>
  );
};

export default ChildDetail;
