import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import { addBreadcrumb } from '@/lib/sentry';
import { logger } from '@/lib/logger';

const log = logger.create('ForgotPasswordForm');

interface ForgotPasswordFormProps {
  onBack: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const limiter = useRateLimiter({ maxAttempts: 3, windowMs: 300_000, lockoutMs: 120_000 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!limiter.recordAttempt()) {
      toast.error(`Too many attempts. Please wait ${limiter.secondsUntilReset}s.`);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      addBreadcrumb({ category: 'auth', message: 'Password reset email sent', level: 'info' });
      toast.success('Check your email for a password reset link');
    } catch (error) {
      log.error('Password reset error:', error);
      // Don't reveal if account exists — always show success-like message
      setSent(true);
      toast.success('If an account exists with that email, a reset link has been sent');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong>{email}</strong>, we've sent a password reset link.
          Check your spam folder if you don't see it.
        </p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Reset password form" noValidate>
      <p className="text-sm text-muted-foreground">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <div className="space-y-2">
        <Label htmlFor="email-reset">Email</Label>
        <Input
          id="email-reset"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
          aria-required="true"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </Button>
      <Button type="button" variant="ghost" onClick={onBack} className="w-full">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to sign in
      </Button>
    </form>
  );
};

export default ForgotPasswordForm;
