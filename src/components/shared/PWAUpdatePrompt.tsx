import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every hour
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
    onRegSWUpdFound() {
      console.log('SW update found');
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-4 right-4 z-50 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
            <RefreshCw className="h-5 w-5 shrink-0 text-primary" />
            <p className="flex-1 text-sm text-card-foreground">
              A new version is available.
            </p>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={handleUpdate} className="h-7 text-xs">
                Update
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-7 text-xs">
                Later
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAUpdatePrompt;
