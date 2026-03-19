import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const log = logger.create('SubscriptionProvider');

export interface SubscriptionState {
  subscribed: boolean;
  creditsRemaining: number | null;
  planName: string | null;
  pricePerClass: number | null;
  isLoading: boolean;
  error: string | null;
}

export interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    creditsRemaining: null,
    planName: null,
    pricePerClass: null,
    isLoading: true,
    error: null,
  });
  const pollIntervalRef = useRef<number>(120000);
  const isRefreshingRef = useRef<boolean>(false);

  const handleSessionRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    isRefreshingRef.current = true;
    log.debug('Attempting session refresh...');
    
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      
      log.debug('Session refreshed successfully');
      pollIntervalRef.current = 120000;
      return true;
    } catch (error) {
      log.error('Session refresh failed', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user || !session?.access_token) {
      setState({
        subscribed: false,
        creditsRemaining: null,
        planName: null,
        pricePerClass: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error && (error.message?.includes('Auth') || error.message?.includes('401'))) {
        log.warn('Auth error detected, attempting refresh...');
        
        const refreshed = await handleSessionRefresh();
        if (refreshed) {
          return fetchSubscription();
        } else {
          setState({
            subscribed: false,
            creditsRemaining: null,
            planName: null,
            pricePerClass: null,
            isLoading: false,
            error: 'Session expired. Please refresh the page.',
          });
          return;
        }
      }

      if (error) throw error;

      if (data?.auth_error) {
        log.warn('Auth error in response, attempting refresh...');
        
        const refreshed = await handleSessionRefresh();
        if (refreshed) {
          return fetchSubscription();
        } else {
          setState({
            subscribed: false,
            creditsRemaining: null,
            planName: null,
            pricePerClass: null,
            isLoading: false,
            error: 'Session expired. Please refresh the page.',
          });
          return;
        }
      }

      pollIntervalRef.current = 120000;

      setState({
        subscribed: data.subscribed || false,
        creditsRemaining: data.credits_remaining ?? null,
        planName: data.plan_name || null,
        pricePerClass: data.price_per_class ?? null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      log.error('Error fetching subscription', err);
      
      pollIntervalRef.current = Math.min(pollIntervalRef.current * 2, 240000);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch subscription',
      }));
    }
  }, [user, session, handleSessionRefresh]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (!user || !session?.access_token) return;

    const interval = setInterval(() => {
      fetchSubscription();
    }, pollIntervalRef.current);

    return () => clearInterval(interval);
  }, [user, session?.access_token, fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        refreshSubscription: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
