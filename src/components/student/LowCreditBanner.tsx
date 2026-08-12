import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';

const DISMISS_KEY = 'low_credit_banner_dismissed_at';

const LowCreditBanner: React.FC = () => {
  const { creditsRemaining, isLoading } = useSubscription();

  const [dismissed, setDismissed] = useState(() => {
    const ts = sessionStorage.getItem(DISMISS_KEY);
    return !!ts;
  });

  if (isLoading || creditsRemaining === null) return null;

  const isZero = creditsRemaining <= 0;
  const isLow = creditsRemaining > 0 && creditsRemaining <= 2;

  if (!isZero && !isLow) return null;
  if (isLow && dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 mb-4 ${
        isZero
          ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200'
          : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
      }`}
    >
      <AlertTriangle
        className={`h-4 w-4 shrink-0 ${isZero ? 'text-red-500' : 'text-amber-500'}`}
      />
      <p className="flex-1 text-sm">
        {isZero
          ? "You're out of hours — book a credit pack to keep your sessions running."
          : `Only ${creditsRemaining} hour${creditsRemaining !== 1 ? 's' : ''} left. Top up before your next class.`}
      </p>
      <Button
        asChild
        size="sm"
        variant={isZero ? 'destructive' : 'outline'}
        className={
          isZero
            ? ''
            : 'border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30'
        }
      >
        <Link to="/pricing">
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          Buy Hours
        </Link>
      </Button>
      {isLow && (
        <button
          onClick={handleDismiss}
          className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default LowCreditBanner;
