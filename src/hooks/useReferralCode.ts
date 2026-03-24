import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

const log = logger.create('useReferralCode');

interface ReferralCodeData {
  code: string;
  timesUsed: number;
  discountAmount: number;
  createdAt: string;
}

interface UsageStats {
  timesUsed: number;
  totalEarnings: number;
  usageHistory: Array<{
    usedAt: string;
    usedByEmail: string;
  }>;
}

export function useReferralCode() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<ReferralCodeData | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresSubscription, setRequiresSubscription] = useState(false);

  const fetchReferralCode = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user's referral code
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('code, times_used, discount_amount, created_at')
        .eq('created_by', user.id)
        .maybeSingle();

      if (codeError) {
        log.error('Error fetching referral code:', codeError);
        setError('Failed to fetch referral code');
        return;
      }

      if (codeData) {
        setReferralCode({
          code: codeData.code,
          timesUsed: codeData.times_used,
          discountAmount: Number(codeData.discount_amount),
          createdAt: codeData.created_at,
        });

        // Fetch the referral code ID first
        const { data: codeIdData } = await supabase
          .from('referral_codes')
          .select('id')
          .eq('created_by', user.id)
          .single();

        // Use secure function for anonymized stats (no email exposure)
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_referral_usage_stats', { p_user_id: user.id });

        if (!statsError && statsData && statsData.length > 0) {
          const stats = statsData[0];
          setUsageStats({
            timesUsed: Number(stats.times_used) || 0,
            totalEarnings: Number(stats.total_earnings) || 0,
            usageHistory: [],
          });
        }
      } else {
        setReferralCode(null);
        setUsageStats(null);
      }
    } catch (err) {
      log.error('Error in fetchReferralCode:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const generateCode = useCallback(async () => {
    if (!user?.id) {
      setError('You must be logged in to generate a referral code');
      return null;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('generate-referral-code');

      if (fnError) {
        log.error('Error generating referral code:', fnError);
        setError('Failed to generate referral code');
        return null;
      }

      if (data?.success && data?.code) {
        // Refresh the referral code data
        setRequiresSubscription(false);
        await fetchReferralCode();
        return data.code;
      } else if (data?.requires_subscription) {
        setRequiresSubscription(true);
        setError('Active Stripe subscription required to generate a referral code');
        return null;
      } else {
        setError(data?.error || 'Failed to generate referral code');
        return null;
      }
    } catch (err) {
      log.error('Error in generateCode:', err);
      setError('An unexpected error occurred');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id, fetchReferralCode]);

  useEffect(() => {
    fetchReferralCode();
  }, [fetchReferralCode]);

  return {
    referralCode,
    usageStats,
    isLoading,
    isGenerating,
    error,
    requiresSubscription,
    generateCode,
    refetch: fetchReferralCode,
  };
}
