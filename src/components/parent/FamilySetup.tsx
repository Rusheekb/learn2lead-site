import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  KeyRound,
  Mail,
  NotebookPen,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatHours } from '@/lib/hours';
import type { FamilyChild } from '@/services/family/types';
import type { FamilySetupStep } from '@/lib/familySetupProgress';
import { ChildFormFields } from './ChildForm';
import { useChildForm } from './useChildForm';

interface FamilySetupProps {
  parentFirstName: string;
  step: Exclude<FamilySetupStep, 'done'>;
  onStep: (step: FamilySetupStep) => void;
  students: FamilyChild[];
  hoursAvailable: number | null;
}

const STEP_LABELS: { id: FamilySetupProps['step']; label: string }[] = [
  { id: 'students', label: 'Add your students' },
  { id: 'hours', label: 'Buy hours' },
  { id: 'next', label: 'What happens next' },
];

const joinNames = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? 'your student')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** First-run guided setup for a new family account. */
const FamilySetup: React.FC<FamilySetupProps> = ({
  parentFirstName,
  step,
  onStep,
  students,
  hoursAvailable,
}) => {
  const form = useChildForm();
  const [showForm, setShowForm] = useState(students.length === 0);
  const current = STEP_LABELS.findIndex((s) => s.id === step);
  const names = students.map((s) => s.firstName);

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await form.submit();
    if (saved === null) return;
    toast.success(`${saved} was added to your family`);
    form.reset();
    setShowForm(false);
  };

  // "Continue" with a half-filled form saves that student first.
  const continueFromStudents = async () => {
    if (showForm && form.values.firstName.trim()) {
      const saved = await form.submit();
      if (saved === null) return;
      toast.success(`${saved} was added to your family`);
      form.reset();
    }
    onStep('hours');
  };

  return (
    <div className="space-y-6 py-4 max-w-2xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">
          Welcome{parentFirstName ? `, ${parentFirstName}` : ''}! Let’s set up
          your family.
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          It takes about two minutes.
        </p>
      </div>

      <ol
        className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm"
        aria-label="Setup steps"
      >
        {STEP_LABELS.map((s, i) => {
          // A skipped "Buy hours" step isn't shown as done.
          const done =
            i < current && (s.id !== 'hours' || (hoursAvailable ?? 0) > 0);
          const active = i === current;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium',
                  done && 'border-green-500 bg-green-500 text-white',
                  active && 'border-tutoring-blue bg-tutoring-blue text-white',
                  !done && !active && 'text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(active ? 'font-medium' : 'text-muted-foreground')}
                aria-current={active ? 'step' : undefined}
              >
                {s.label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <span
                  className="hidden sm:inline text-muted-foreground"
                  aria-hidden="true"
                >
                  —
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {step === 'students' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Who’s getting tutoring?</CardTitle>
            <CardDescription>
              Add each child you’d like tutoring for. They don’t need an email
              or a login — you’ll get their reminders and updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {students.length > 0 && (
              <ul className="space-y-2">
                {students.map((s) => (
                  <li
                    key={s.studentId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2
                      className="h-4 w-4 text-green-500"
                      aria-hidden="true"
                    />
                    <span className="font-medium">
                      {`${s.firstName} ${s.lastName}`.trim()}
                    </span>
                    {s.grade && (
                      <span className="text-muted-foreground">
                        · Grade {s.grade}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {showForm ? (
              <form onSubmit={addStudent} noValidate className="space-y-4">
                <ChildFormFields
                  values={form.values}
                  setField={form.setField}
                  error={form.error}
                  idPrefix="setup-child"
                  autoFocus
                />
                <Button
                  type="submit"
                  variant={students.length ? 'secondary' : 'default'}
                  disabled={form.isSaving}
                >
                  {form.isSaving ? 'Adding…' : 'Add student'}
                </Button>
              </form>
            ) : (
              <Button variant="outline" onClick={() => setShowForm(true)}>
                + Add another student
              </Button>
            )}

            {students.length > 0 && (
              <div className="flex justify-end border-t pt-4">
                <Button onClick={continueFromStudents} disabled={form.isSaving}>
                  Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'hours' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buy hours for your family</CardTitle>
            <CardDescription>
              Hours are shared by everyone in your family — a one-hour class
              uses one hour. Bigger packs cost less per hour.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(hoursAvailable ?? 0) > 0 ? (
              <>
                <p className="flex items-center gap-2 text-sm">
                  <CheckCircle2
                    className="h-4 w-4 text-green-500"
                    aria-hidden="true"
                  />
                  You have {formatHours(hoursAvailable ?? 0)} ready to use.
                </p>
                <div className="flex justify-end">
                  <Button onClick={() => onStep('next')}>Continue</Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/pricing">Choose an hour pack</Link>
                </Button>
                <Button variant="ghost" onClick={() => onStep('next')}>
                  I’ll do this later
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'next' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">You’re all set</CardTitle>
            <CardDescription>Here’s what happens from here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <Users
                  className="h-5 w-5 shrink-0 text-tutoring-blue"
                  aria-hidden="true"
                />
                <span>
                  We’ll match {joinNames(names)} with a tutor and email you as
                  soon as they’re paired.
                </span>
              </li>
              <li className="flex gap-3">
                <CalendarCheck
                  className="h-5 w-5 shrink-0 text-tutoring-blue"
                  aria-hidden="true"
                />
                <span>
                  The tutor schedules classes. You’ll get a reminder the day
                  before each one, with the Zoom link.
                </span>
              </li>
              <li className="flex gap-3">
                <NotebookPen
                  className="h-5 w-5 shrink-0 text-tutoring-blue"
                  aria-hidden="true"
                />
                <span>
                  After every class you’ll get the tutor’s notes and homework.
                </span>
              </li>
              <li className="flex gap-3">
                <KeyRound
                  className="h-5 w-5 shrink-0 text-tutoring-blue"
                  aria-hidden="true"
                />
                <span>
                  Want {names.length === 1 ? names[0] : 'your students'} to sign
                  in? Open a student’s page and set up their sign-in — a
                  username, no email needed. They never see prices or payments.
                </span>
              </li>
              <li className="flex gap-3">
                <Mail
                  className="h-5 w-5 shrink-0 text-tutoring-blue"
                  aria-hidden="true"
                />
                <span>
                  Questions? Email{' '}
                  <span className="font-medium">
                    learn2leadtutoring@gmail.com
                  </span>
                  .
                </span>
              </li>
            </ul>
            <div className="flex justify-end">
              <Button onClick={() => onStep('done')}>
                Go to my family dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FamilySetup;
