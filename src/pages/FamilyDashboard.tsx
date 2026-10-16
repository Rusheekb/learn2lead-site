import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ContentTransition } from '@/components/shared/PageTransition';
import ProfilePage from '@/components/shared/ProfilePage';
import MessagesPage from '@/components/shared/messages/MessagesPage';
import FamilyOverview from '@/components/parent/FamilyOverview';
import ChildDetail from '@/components/parent/ChildDetail';

/**
 * The parent's dashboard (family accounts): the family overview, one
 * student's detail (?child=<id>), messages (?tab=messages), or settings
 * (?tab=profile).
 */
const FamilyDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab');
  const childId = searchParams.get('child');

  useEffect(() => {
    if (searchParams.get('purchase') === 'success') {
      toast.success(
        'Payment successful! Your hours have been added and are ready to use.',
        { duration: 6000 }
      );
      const next = new URLSearchParams(searchParams);
      next.delete('purchase');
      navigate({ search: next.toString() }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content =
    tab === 'profile' ? (
      <ProfilePage />
    ) : tab === 'messages' ? (
      <MessagesPage />
    ) : childId ? (
      <ChildDetail studentId={childId} />
    ) : (
      <FamilyOverview />
    );

  return (
    <ContentTransition transitionKey={`${tab ?? ''}:${childId ?? ''}`}>
      {content}
    </ContentTransition>
  );
};

export default FamilyDashboard;
