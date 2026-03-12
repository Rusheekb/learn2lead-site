import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          role="alert"
          aria-live="assertive"
          className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium shadow-lg"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You're offline. Some features may be unavailable.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
