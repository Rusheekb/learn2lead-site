import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
        console.error('Error fetching referral code:', codeError);
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

        if (codeIdData?.id) {
          // Fetch usage history for this code
          const { data: usageData, error: usageError } = await supabase
            .from('referral_usage')
            .select(`
              used_at,
              used_by_email,
              referral_code_id
            `)
            .eq('referral_code_id', codeIdData.id)
            .order('used_at', { ascending: false });

          if (!usageError && usageData) {
            const earnings = usageData.length * 25; // $25 per referral
            setUsageStats({
              timesUsed: usageData.length,
              totalEarnings: earnings,
              usageHistory: usageData.map(u => ({
                usedAt: u.used_at,
                usedByEmail: u.used_by_email,
              })),
            });
          }
        }
      } else {
        setReferralCode(null);
        setUsageStats(null);
      }
    } catch (err) {
      console.error('Error in fetchReferralCode:', err);
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
        console.error('Error generating referral code:', fnError);
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
      console.error('Error in generateCode:', err);
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
