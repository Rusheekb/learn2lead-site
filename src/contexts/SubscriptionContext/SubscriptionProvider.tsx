import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  creditsRemaining: number | null;
  planName: string | null;
  isLoading: boolean;
  error: string | null;
  isPaused: boolean;
  pauseResumesAt: string | null;
}

export interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    creditsRemaining: null,
    planName: null,
    isLoading: true,
    error: null,
    isPaused: false,
    pauseResumesAt: null,
  });
  const pollIntervalRef = useRef<number>(60000); // Start with 60 seconds
  const isRefreshingRef = useRef<boolean>(false);

  const handleSessionRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    isRefreshingRef.current = true;
    console.log('[SubscriptionProvider] Attempting session refresh...');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      console.log('[SubscriptionProvider] Session refreshed successfully');
      pollIntervalRef.current = 60000; // Reset to normal interval
      return true;
    } catch (error) {
      console.error('[SubscriptionProvider] Session refresh failed:', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user || !session?.access_token) {
      setState({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        creditsRemaining: null,
        planName: null,
        isLoading: false,
        error: null,
        isPaused: false,
        pauseResumesAt: null,
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

      // Handle authentication errors (401)
      if (error && (error.message?.includes('Auth') || error.message?.includes('401'))) {
        console.warn('[SubscriptionProvider] Auth error detected, attempting refresh...');
        
        const refreshed = await handleSessionRefresh();
        if (refreshed) {
          // Retry fetch after refresh
          return fetchSubscription();
        } else {
          // Refresh failed, set auth error state
          setState({
            subscribed: false,
            productId: null,
            subscriptionEnd: null,
            creditsRemaining: null,
            planName: null,
            isLoading: false,
            error: 'Session expired. Please refresh the page.',
            isPaused: false,
            pauseResumesAt: null,
          });
          return;
        }
      }

      if (error) throw error;

      // Check if response indicates auth error
      if (data?.auth_error) {
        console.warn('[SubscriptionProvider] Auth error in response, attempting refresh...');
        
        const refreshed = await handleSessionRefresh();
        if (refreshed) {
          return fetchSubscription();
        } else {
          setState({
            subscribed: false,
            productId: null,
            subscriptionEnd: null,
            creditsRemaining: null,
            planName: null,
            isLoading: false,
            error: 'Session expired. Please refresh the page.',
            isPaused: false,
            pauseResumesAt: null,
          });
          return;
        }
      }

      // Success - reset poll interval
      pollIntervalRef.current = 60000;

      setState({
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        creditsRemaining: data.credits_remaining ?? null,
        planName: data.plan_name || null,
        isLoading: false,
        error: null,
        isPaused: data.is_paused || false,
        pauseResumesAt: data.pause_resumes_at || null,
      });
    } catch (err) {
      console.error('[SubscriptionProvider] Error fetching subscription:', err);
      
      // Implement exponential backoff for errors
      pollIntervalRef.current = Math.min(pollIntervalRef.current * 2, 240000); // Max 4 minutes
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch subscription',
      }));
    }
  }, [user, session, handleSessionRefresh]);

  // Initial fetch and on auth changes
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Smart polling with dynamic interval
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
