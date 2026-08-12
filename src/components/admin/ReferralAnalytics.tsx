import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Gift,
  Users,
  DollarSign,
  TrendingUp,
  Crown,
  Calendar,
  Plus,
  PowerOff,
  Power,
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
import { toast } from 'sonner';
import { logAdminAction } from '@/services/adminActivityLog';

interface ReferralCode {
  id: string;
  code: string;
  times_used: number;
  discount_amount: number;
  active: boolean;
  created_at: string;
  max_uses: number | null;
  expires_at: string | null;
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

interface NewCodeForm {
  code: string;
  discountAmount: string;
  maxUses: string;
  expiresAt: string;
}

const DEFAULT_FORM: NewCodeForm = {
  code: '',
  discountAmount: '25',
  maxUses: '',
  expiresAt: '',
};

const ReferralAnalytics: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewCodeForm>(DEFAULT_FORM);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch all referral codes with their usage stats
  const { data: referralCodes, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['admin-referral-codes'],
    queryFn: async () => {
      const { data: codes, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                  profile.email
                : 'Unknown',
              referrer_email: profile?.email,
            };
          }
          return { ...code, referrer_name: 'Admin', referrer_email: null };
        })
      );

      return codesWithProfiles as ReferralCode[];
    },
  });

  const { data: recentUsage, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['admin-referral-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_usage')
        .select('id, used_at, used_by_email, referral_code_id')
        .order('used_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const usageWithCodes = await Promise.all(
        (data || []).map(async (usage) => {
          const { data: codeData } = await supabase
            .from('referral_codes')
            .select('code')
            .eq('id', usage.referral_code_id)
            .single();
          return { ...usage, code: codeData?.code || 'Unknown' };
        })
      );

      return usageWithCodes as ReferralUsage[];
    },
  });

  // Create new code mutation
  const createMutation = useMutation({
    mutationFn: async (values: NewCodeForm) => {
      const { data, error } = await supabase.functions.invoke(
        'admin-create-referral-code',
        {
          body: {
            code: values.code,
            discountAmount: parseFloat(values.discountAmount),
            maxUses: values.maxUses ? parseInt(values.maxUses, 10) : null,
            expiresAt: values.expiresAt || null,
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, values) => {
      toast.success('Referral code created');
      logAdminAction({
        actionType: 'referral_created',
        description: `Created referral code ${values.code} — $${values.discountAmount} discount`,
        entityType: 'referral_code',
        metadata: { code: values.code, discountAmount: values.discountAmount },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-referral-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity-log'] });
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create referral code');
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      setTogglingId(id);
      const { error } = await supabase
        .from('referral_codes')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { id, active }) => {
      const code = referralCodes?.find((c) => c.id === id);
      toast.success(active ? 'Code activated' : 'Code deactivated');
      logAdminAction({
        actionType: 'referral_toggled',
        description: `${active ? 'Activated' : 'Deactivated'} referral code${code ? ` ${code.code}` : ''}`,
        entityType: 'referral_code',
        entityId: id,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-referral-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity-log'] });
    },
    onError: () => {
      toast.error('Failed to update code');
    },
    onSettled: () => setTogglingId(null),
  });

  // Stats
  const totalCodes = referralCodes?.length || 0;
  const activeCodes = referralCodes?.filter((c) => c.active).length || 0;
  const totalReferrals =
    referralCodes?.reduce((sum, c) => sum + c.times_used, 0) || 0;
  const totalDiscounts =
    referralCodes?.reduce(
      (sum, c) => sum + c.times_used * c.discount_amount,
      0
    ) || 0;
  const last7DaysReferrals =
    recentUsage?.filter(
      (u) => new Date(u.used_at) > subDays(startOfDay(new Date()), 7)
    ).length || 0;
  const topReferrers =
    referralCodes?.filter((c) => c.times_used > 0).slice(0, 5) || [];

  const handleFormChange = (field: keyof NewCodeForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error('Code is required');
      return;
    }
    const amount = parseFloat(form.discountAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Discount must be a positive number');
      return;
    }
    createMutation.mutate(form);
  };

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
      <div>
        <h3 className="text-lg font-semibold">Referral Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Track referral code performance and user rewards
        </p>
      </div>

      {/* Stats */}
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
              <span className="text-sm text-muted-foreground">
                Total Referrals
              </span>
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
              <span className="text-sm text-muted-foreground">
                Credits Awarded
              </span>
            </div>
            <p className="text-2xl font-bold">${totalDiscounts.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">to referrers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Discounts Given
              </span>
            </div>
            <p className="text-2xl font-bold">${totalDiscounts.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">to new users</p>
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
                        ${referrer.times_used * referrer.discount_amount} earned
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
            <CardDescription>Latest referral code usage</CardDescription>
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
                          {usage.used_by_email.replace(
                            /(.{2})(.*)(@.*)/,
                            '$1***$3'
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(usage.used_at), {
                            addSuffix: true,
                          })}
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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">All Referral Codes</CardTitle>
            <CardDescription>
              Complete list of referral codes — click the toggle to activate or
              deactivate a code
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Code
          </Button>
        </CardHeader>
        <CardContent>
          {!referralCodes || referralCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No referral codes yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralCodes.map((code) => (
                  <TableRow
                    key={code.id}
                    className={!code.active ? 'opacity-50' : ''}
                  >
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
                    <TableCell className="font-medium">
                      ${code.discount_amount.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{code.times_used}</span>
                      {code.max_uses && (
                        <span className="text-xs text-muted-foreground ml-1">
                          / {code.max_uses}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {code.expires_at
                        ? `Expires ${format(new Date(code.expires_at), 'MMM d, yyyy')}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.active ? 'default' : 'secondary'}>
                        {code.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={togglingId === code.id}
                        onClick={() =>
                          toggleMutation.mutate({
                            id: code.id,
                            active: !code.active,
                          })
                        }
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {code.active ? (
                          <>
                            <PowerOff className="h-3.5 w-3.5 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="h-3.5 w-3.5 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Code Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setForm(DEFAULT_FORM);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Referral Code</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rc-code">Code</Label>
              <Input
                id="rc-code"
                placeholder="e.g. SUMMER25"
                value={form.code}
                onChange={(e) =>
                  handleFormChange(
                    'code',
                    e.target.value.toUpperCase().replace(/\s/g, '-')
                  )
                }
                className="font-mono uppercase"
                required
              />
              <p className="text-xs text-muted-foreground">
                Will be uppercased automatically.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rc-discount">Discount amount ($)</Label>
              <Input
                id="rc-discount"
                type="number"
                min="1"
                step="1"
                placeholder="25"
                value={form.discountAmount}
                onChange={(e) =>
                  handleFormChange('discountAmount', e.target.value)
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rc-max-uses">
                  Max uses{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="rc-max-uses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={(e) => handleFormChange('maxUses', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc-expires">
                  Expires{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="rc-expires"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) =>
                    handleFormChange('expiresAt', e.target.value)
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setForm(DEFAULT_FORM);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralAnalytics;
