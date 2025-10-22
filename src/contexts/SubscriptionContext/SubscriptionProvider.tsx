import React, { createContext, useState, useEffect, useCallback } from 'react';
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
  });

  const fetchSubscription = useCallback(async () => {
    if (!user || !session) {
      setState({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        creditsRemaining: null,
        planName: null,
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

      if (error) throw error;

      setState({
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        creditsRemaining: data.credits_remaining ?? null,
        planName: data.plan_name || null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch subscription',
      }));
    }
  }, [user, session]);

  // Initial fetch and on auth changes
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, fetchSubscription]);

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
