import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, X, ArrowRight } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

const DISMISS_KEY = 'zoom_nudge_dismissed';

const ZoomLinkNudge: React.FC = () => {
  const { profile, isLoading } = useProfile();

  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  if (isLoading || !profile) return null;
  if (profile.zoom_link) return null;
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:bg-blue-950/30 dark:border-blue-800">
      <Video className="h-4 w-4 shrink-0 text-blue-500" />
      <p className="flex-1 text-sm text-blue-900 dark:text-blue-200">
        Add your Zoom link in Settings — it will auto-fill whenever you schedule
        a class.
      </p>
      <Link
        to="/tutor-dashboard?tab=profile"
        className="shrink-0 flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 transition-colors"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
      >
        Go to Settings
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
        className="shrink-0 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ZoomLinkNudge;
