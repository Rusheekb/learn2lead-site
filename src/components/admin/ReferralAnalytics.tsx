import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Gift, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Crown,
  Calendar 
} from 'lucide-react';
import { formatDistanceToNow, format, subDays, startOfDay } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ReferralCode {
  id: string;
  code: string;
  times_used: number;
  discount_amount: number;
  active: boolean;
  created_at: string;
  created_by: string | null;
  referrer_name?: string;
  referrer_email?: string;
}

interface ReferralUsage {
  id: string;
  used_at: string;
  used_by_email: string;
  referral_code_id: string;
  code?: string;
}

const ReferralAnalytics: React.FC = () => {
  // Fetch all referral codes with their usage stats
  const { data: referralCodes, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['admin-referral-codes'],
    queryFn: async () => {
      const { data: codes, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('times_used', { ascending: false });

      if (error) throw error;

      // Fetch referrer profiles
      const codesWithProfiles = await Promise.all(
        (codes || []).map(async (code) => {
          if (code.created_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', code.created_by)
              .single();

            return {
              ...code,
              referrer_name: profile
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
                : 'Unknown',
              referrer_email: profile?.email,
            };
          }
          return { ...code, referrer_name: 'System', referrer_email: null };
        })
      );

      return codesWithProfiles as ReferralCode[];
    },
  });

  // Fetch recent referral usage
  const { data: recentUsage, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['admin-referral-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_usage')
        .select(`
          id,
          used_at,
          used_by_email,
          referral_code_id
        `)
        .order('used_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get the code names
      const usageWithCodes = await Promise.all(
        (data || []).map(async (usage) => {
          const { data: codeData } = await supabase
            .from('referral_codes')
            .select('code')
            .eq('id', usage.referral_code_id)
            .single();

          return {
            ...usage,
            code: codeData?.code || 'Unknown',
          };
        })
      );

      return usageWithCodes as ReferralUsage[];
    },
  });

  // Calculate stats
  const totalCodes = referralCodes?.length || 0;
  const activeCodes = referralCodes?.filter((c) => c.active).length || 0;
  const totalReferrals = referralCodes?.reduce((sum, c) => sum + c.times_used, 0) || 0;
  const totalEarnings = totalReferrals * 25; // $25 per referral

  // Calculate last 7 days referrals
  const last7DaysReferrals = recentUsage?.filter(
    (u) => new Date(u.used_at) > subDays(startOfDay(new Date()), 7)
  ).length || 0;

  // Top referrers
  const topReferrers = referralCodes
    ?.filter((c) => c.times_used > 0)
    .slice(0, 5) || [];

  if (isLoadingCodes || isLoadingUsage) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-10 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Referral Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Track referral code performance and user rewards
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Codes</span>
            </div>
            <p className="text-2xl font-bold">{totalCodes}</p>
            <p className="text-xs text-muted-foreground">
              {activeCodes} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Referrals</span>
            </div>
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-green-600">
              +{last7DaysReferrals} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Credits Awarded</span>
            </div>
            <p className="text-2xl font-bold">${totalEarnings}</p>
            <p className="text-xs text-muted-foreground">
              to referrers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Discounts Given</span>
            </div>
            <p className="text-2xl font-bold">${totalEarnings}</p>
            <p className="text-xs text-muted-foreground">
              to new users
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-yellow-500" />
              Top Referrers
            </CardTitle>
            <CardDescription>
              Users with the most successful referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topReferrers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No referrals yet
              </p>
            ) : (
              <div className="space-y-3">
                {topReferrers.map((referrer, index) => (
                  <div
                    key={referrer.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? 'bg-yellow-500 text-yellow-900'
                            : index === 1
                            ? 'bg-gray-300 text-gray-700'
                            : index === 2
                            ? 'bg-amber-600 text-amber-100'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {referrer.referrer_name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {referrer.code}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{referrer.times_used}</p>
                      <p className="text-xs text-green-600">
                        ${referrer.times_used * 25} earned
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Recent Referrals
            </CardTitle>
            <CardDescription>
              Latest referral code usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!recentUsage || recentUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent referrals
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentUsage.slice(0, 10).map((usage) => (
                  <div
                    key={usage.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {usage.used_by_email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm">
                          {usage.used_by_email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(usage.used_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {usage.code}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Referral Codes</CardTitle>
          <CardDescription>
            Complete list of generated referral codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referralCodes?.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-medium">
                    {code.code}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{code.referrer_name}</p>
                      {code.referrer_email && (
                        <p className="text-xs text-muted-foreground">
                          {code.referrer_email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{code.times_used}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      (${code.times_used * 25})
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={code.active ? 'default' : 'secondary'}>
                      {code.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(code.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralAnalytics;
