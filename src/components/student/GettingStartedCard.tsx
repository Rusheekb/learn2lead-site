import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import ChecklistCard, {
  ChecklistStep,
} from '@/components/shared/ChecklistCard';

const GettingStartedCard: React.FC = () => {
  const { user } = useAuth();
  const {
    creditsRemaining,
    managedBy,
    isLoading: creditsLoading,
  } = useSubscription();

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

  const steps: ChecklistStep[] = [
    {
      label: 'Create your account',
      description: "You're in!",
      done: true,
    },
    managedBy
      ? {
          label: 'Hours from your parent',
          description: `${managedBy.name} buys hours for your classes.`,
          done: true,
        }
      : {
          label: 'Buy your first hours',
          description: 'Purchase an hour pack to get started.',
          done: (creditsRemaining ?? 0) > 0,
          cta: { label: 'Buy Hours', to: '/pricing' },
        },
    {
      label: 'Get paired with a tutor',
      description: "We'll match you with the right tutor — sit tight.",
      done: !!hasTutor,
    },
    {
      label: 'Attend your first session',
      description: 'Your tutor will schedule your first class.',
      done: !!hasClass,
    },
  ];

  return <ChecklistCard steps={steps} />;
};

export default GettingStartedCard;
