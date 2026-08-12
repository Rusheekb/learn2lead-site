import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  Circle,
  CreditCard,
  Users,
  CalendarCheck,
  Rocket,
} from 'lucide-react';

interface Step {
  label: string;
  description: string;
  done: boolean;
  icon: React.ReactNode;
  cta?: { label: string; to: string };
}

const GettingStartedCard: React.FC = () => {
  const { user } = useAuth();
  const { creditsRemaining, isLoading: creditsLoading } = useSubscription();

  const { data: hasTutor, isLoading: tutorLoading } = useQuery({
    queryKey: ['student-has-tutor', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tutor_student_assigned')
        .select('id')
        .eq('student_id', user!.id)
        .eq('active', true)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60_000,
  });

  const { data: hasClass, isLoading: classLoading } = useQuery({
    queryKey: ['student-has-class', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('scheduled_classes')
        .select('id')
        .eq('student_id', user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60_000,
  });

  if (creditsLoading || tutorLoading || classLoading) return null;

  const steps: Step[] = [
    {
      label: 'Create your account',
      description: "You're in!",
      done: true,
      icon: <Rocket className="h-4 w-4" />,
    },
    {
      label: 'Buy your first hours',
      description: 'Purchase a credit pack to get started.',
      done: (creditsRemaining ?? 0) > 0,
      icon: <CreditCard className="h-4 w-4" />,
      cta: { label: 'Buy Hours', to: '/pricing' },
    },
    {
      label: 'Get paired with a tutor',
      description: "We'll match you with the right tutor — sit tight.",
      done: !!hasTutor,
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Attend your first session',
      description: 'Your tutor will schedule your first class.',
      done: !!hasClass,
      icon: <CalendarCheck className="h-4 w-4" />,
    },
  ];

  // Hide the card once all steps are complete
  if (steps.every((s) => s.done)) return null;

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <Card className="mb-6 border-tutoring-blue/30 bg-tutoring-lightBlue/40 dark:bg-tutoring-blue/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-tutoring-blue" />
            Getting Started
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {completedCount} / {steps.length} complete
          </span>
        </CardTitle>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-tutoring-blue rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 shrink-0 ${
                  step.done ? 'text-green-500' : 'text-muted-foreground'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium leading-snug ${
                    step.done ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                    {step.cta && (
                      <>
                        {' '}
                        <Link
                          to={step.cta.to}
                          className="text-tutoring-blue font-medium hover:underline"
                        >
                          {step.cta.label} →
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

export default GettingStartedCard;
