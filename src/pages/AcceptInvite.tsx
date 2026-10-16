import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { acceptParentInvite } from '@/services/family/mutations';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Where a parent lands from a student's invite email. Accepting needs the
 * parent signed in with the invited address; the server checks that and
 * moves the student's billing to them.
 */
const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { user, isLoading, signOut } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnUrl = `/accept-invite?token=${encodeURIComponent(token)}`;
  const loginLink = (mode?: 'signup') =>
    `/login?returnUrl=${encodeURIComponent(returnUrl)}${mode ? '&mode=signup' : ''}`;

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      await acceptParentInvite(token);
      // A full load picks up the parent role and the moved balance.
      window.location.assign('/family');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not accept the invitation.'
      );
      setIsAccepting(false);
    }
  };

  let body: React.ReactNode;
  if (!UUID_RE.test(token)) {
    body = (
      <p className="text-sm text-muted-foreground">
        This invitation link is incomplete. Open the link from the email again,
        or ask the student to send a new invite.
      </p>
    );
  } else if (isLoading) {
    body = <p className="text-sm text-muted-foreground">Loading…</p>;
  } else if (!user) {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sign in, or create your account, with the email address this
          invitation was sent to.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={loginLink('signup')}>Create an account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={loginLink()}>Sign in</Link>
          </Button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        <p className="text-sm">
          You’re signed in as <strong>{user.email}</strong>. When you accept,
          you’ll be able to follow this student’s classes and notes, and their
          tutoring hours, saved card and auto-renew move to your account.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAccept} disabled={isAccepting}>
            {isAccepting ? 'Accepting…' : 'Accept invitation'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => signOut()}
            disabled={isAccepting}
          >
            Use a different account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 pt-20 pb-10 focus:outline-none"
      >
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Parent invitation</CardTitle>
            <CardDescription>
              A Learn2Lead student invited you to manage their tutoring.
            </CardDescription>
          </CardHeader>
          <CardContent>{body}</CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AcceptInvite;
