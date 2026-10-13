import { useTimezoneSync } from '@/hooks/useTimezoneSync';

/** Renders nothing; applies the signed-in user's time zone app-wide. */
const TimezoneSync = () => {
  useTimezoneSync();
  return null;
};

export default TimezoneSync;
