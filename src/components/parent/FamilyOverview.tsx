import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarDays, Pencil, Plus, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useMyChildren } from '@/hooks/queries/useFamilyQueries';
import { fetchScheduledClasses } from '@/services/class/fetch';
import type { ClassEvent } from '@/types/tutorTypes';
import { formatTime } from '@/utils/dateTimeUtils';
import type { FamilyChild } from '@/services/family/types';
import { SimpleCreditsCounter } from '@/components/student/SimpleCreditsCounter';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useProfile } from '@/hooks/useProfile';
import {
  FamilySetupStep,
  getFamilySetupStep,
  setFamilySetupStep,
} from '@/lib/familySetupProgress';
import ChildFormDialog from './ChildFormDialog';
import FamilySetup from './FamilySetup';
import PendingInvitesCard from './PendingInvitesCard';
import FamilyHoursHistory from './FamilyHoursHistory';

const classLine = (c: ClassEvent) =>
  `${format(c.date, 'EEE, MMM d')} · ${formatTime(c.startTime)}${c.tzAbbr ? ` ${c.tzAbbr}` : ''} · ${c.subject || c.title}${c.tutorName ? ` with ${c.tutorName}` : ''}`;

/** The parent's home: balance, invitations, each student, family history. */
const FamilyOverview: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { creditsRemaining } = useSubscription();
  const { data: children = [], isLoading } = useMyChildren();
  const [setupStep, setSetupStepState] = useState<FamilySetupStep | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyChild | undefined>();
  const [editOpen, setEditOpen] = useState(false);

  // RLS shows a parent exactly their children's classes.
  const { data: classes = [] } = useQuery({
    queryKey: ['family', 'classes', user?.id],
    queryFn: () => fetchScheduledClasses(),
    enabled: !!user?.id && children.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // First-run setup: decided once the student list has loaded, then saved
  // right away — otherwise adding the first student (which makes the family
  // look "already set up") would end setup before the parent is done.
  const derivedStep =
    isLoading || !user ? null : getFamilySetupStep(user.id, children.length);
  useEffect(() => {
    if (setupStep !== null || derivedStep === null || !user) return;
    if (derivedStep !== 'done') setFamilySetupStep(user.id, derivedStep);
    setSetupStepState(derivedStep);
  }, [setupStep, derivedStep, user]);
  const step = setupStep ?? derivedStep;
  const goToStep = (next: FamilySetupStep) => {
    if (user) setFamilySetupStep(user.id, next);
    setSetupStepState(next);
  };

  const upcomingByChild = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, ClassEvent[]>();
    for (const c of classes) {
      if (c.status !== 'scheduled' || !c.studentId) continue;
      if (c.startAt && new Date(c.startAt).getTime() < now) continue;
      const list = map.get(c.studentId) ?? [];
      list.push(c);
      map.set(c.studentId, list);
    }
    return map;
  }, [classes]);

  if (isLoading || step === null) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (step !== 'done') {
    return (
      <FamilySetup
        parentFirstName={profile?.first_name ?? ''}
        step={step}
        onStep={goToStep}
        students={children}
        hoursAvailable={creditsRemaining}
      />
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
          Your family
        </h2>
        {children.length > 0 && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add a student
          </Button>
        )}
      </div>

      <PendingInvitesCard />
      <SimpleCreditsCounter label="Family Hours Available" />

      {children.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add your first student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal pl-5 space-y-1">
              <li>Add each child you’d like tutoring for — no email needed.</li>
              <li>
                Buy hours once for the whole family from{' '}
                <Link to="/pricing" className="underline">
                  Pricing
                </Link>
                .
              </li>
              <li>
                We pair each student with a tutor and you’ll get an email.
              </li>
            </ol>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              Add a student
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => {
            const next = upcomingByChild.get(child.studentId)?.[0];
            const count = upcomingByChild.get(child.studentId)?.length ?? 0;
            return (
              <Card key={child.studentId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    {`${child.firstName} ${child.lastName}`.trim()}
                    {child.grade && (
                      <span className="text-xs font-normal text-muted-foreground">
                        · Grade {child.grade}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm flex items-start gap-2">
                    <CalendarDays
                      className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span>
                      {next ? (
                        <>
                          Next: {classLine(next)}
                          {count > 1 && (
                            <span className="text-muted-foreground">
                              {' '}
                              (+{count - 1} more)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          No upcoming classes
                        </span>
                      )}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/family?child=${child.studentId}`}>
                        Schedule & notes
                      </Link>
                    </Button>
                    {child.managed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(child);
                          setEditOpen(true);
                        }}
                        aria-label={`Edit ${child.firstName}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FamilyHoursHistory />

      <ChildFormDialog open={addOpen} onOpenChange={setAddOpen} />
      {editing && (
        <ChildFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          child={editing}
        />
      )}
    </div>
  );
};

export default FamilyOverview;
