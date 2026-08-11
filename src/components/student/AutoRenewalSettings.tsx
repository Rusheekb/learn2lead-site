import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CREDIT_TIERS, STRIPE_PLAN_PRICES } from '@/config/stripe';
import type { StripePlanKey } from '@/config/stripe';
import { logger } from '@/lib/logger';

const log = logger.create('AutoRenewalSettings');

interface AutoRenewalRow {
  id: string;
  student_id: string;
  enabled: boolean;
  renewal_pack: string;
  threshold: number;
  last_renewal_at: string | null;
  last_renewal_error: string | null;
}

const PACK_OPTIONS: {
  value: StripePlanKey;
  label: string;
  credits: number;
  price: number;
}[] = [
  { value: 'basic', label: '4 Hour Pack', credits: 4, price: 140 },
  { value: 'standard', label: '8 Hour Pack', credits: 8, price: 240 },
  { value: 'premium', label: '12 Hour Pack', credits: 12, price: 300 },
];

export const AutoRenewalSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  // "Saved" values — what's actually persisted. The pack Select and threshold
  // Slider edit a separate "pending" copy so a stray click/drag can't silently
  // change a real setting; the user has to explicitly confirm.
  const [renewalPack, setRenewalPack] = useState<StripePlanKey>('standard');
  const [threshold, setThreshold] = useState(1);
  const [pendingPack, setPendingPack] = useState<StripePlanKey>('standard');
  const [pendingThreshold, setPendingThreshold] = useState(1);
  const [lastRenewalAt, setLastRenewalAt] = useState<string | null>(null);
  const [lastRenewalError, setLastRenewalError] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (user?.id) fetchSettings();
  }, [user?.id]);

  const fetchSettings = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auto_renewal_settings' as any)
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const row = data as unknown as AutoRenewalRow;
        setSettingsId(row.id);
        setEnabled(row.enabled);
        setRenewalPack(row.renewal_pack as StripePlanKey);
        setThreshold(row.threshold);
        setPendingPack(row.renewal_pack as StripePlanKey);
        setPendingThreshold(row.threshold);
        setLastRenewalAt(row.last_renewal_at);
        setLastRenewalError(row.last_renewal_error);
      }
    } catch (err) {
      log.error('Failed to load auto-renewal settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (
    updates: Partial<{
      enabled: boolean;
      renewal_pack: string;
      threshold: number;
    }>
  ) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      if (settingsId) {
        const { error } = await supabase
          .from('auto_renewal_settings' as any)
          .update(updates)
          .eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('auto_renewal_settings' as any)
          .insert({ student_id: user.id, ...updates })
          .select()
          .single();
        if (error) throw error;
        if (data) setSettingsId((data as any).id);
      }
      toast.success('Auto-renewal settings saved');
    } catch (err) {
      log.error('Failed to save auto-renewal settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    saveSettings({ enabled: checked, renewal_pack: renewalPack, threshold });
  };

  // Pack/threshold only update the pending copy — no save until confirmed.
  const handlePackChange = (value: string) => {
    setPendingPack(value as StripePlanKey);
  };

  const handleThresholdChange = (value: number[]) => {
    setPendingThreshold(value[0]);
  };

  const isDirty = pendingPack !== renewalPack || pendingThreshold !== threshold;

  const handleConfirmChanges = async () => {
    await saveSettings({
      renewal_pack: pendingPack,
      threshold: pendingThreshold,
    });
    setRenewalPack(pendingPack);
    setThreshold(pendingThreshold);
  };

  const handleDiscardChanges = () => {
    setPendingPack(renewalPack);
    setPendingThreshold(threshold);
  };

  const handleRetry = async () => {
    if (!user?.id) return;
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'process-auto-renewal',
        {
          body: { student_id: user.id, renewal_pack: renewalPack },
        }
      );
      if (error) throw error;
      if (data?.success === false) {
        const reason =
          data.reason === 'cooldown'
            ? 'A renewal was processed recently. Please wait before retrying.'
            : data.error ||
              'Renewal failed — please check your payment method.';
        toast.error(reason);
      } else {
        toast.success('Renewal successful! Credits have been added.');
        setLastRenewalError(null);
        await fetchSettings();
      }
    } catch (err) {
      log.error('Retry failed:', err);
      toast.error(
        'Retry failed — please try again or update your payment method.'
      );
    } finally {
      setRetrying(false);
    }
  };

  // Preview reflects the pending (unconfirmed) selection, not the saved one.
  const selectedPack = PACK_OPTIONS.find((p) => p.value === pendingPack);
  const price = selectedPack?.price ?? STRIPE_PLAN_PRICES[pendingPack];

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-6">
          <div className="animate-pulse flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <div className="h-4 bg-muted rounded w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Auto-Renewal</CardTitle>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving}
            aria-label="Toggle auto-renewal"
          />
        </div>
        <CardDescription>
          Automatically purchase hours when your balance gets low
        </CardDescription>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-5 pt-0">
          <div className="space-y-2">
            <Label htmlFor="renewal-pack">Hour Pack</Label>
            <Select
              value={pendingPack}
              onValueChange={handlePackChange}
              disabled={saving}
            >
              <SelectTrigger id="renewal-pack">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — ${opt.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>
              Renew when hours reach:{' '}
              <span className="font-bold text-primary">{pendingThreshold}</span>
            </Label>
            <Slider
              value={[pendingThreshold]}
              onValueChange={handleThresholdChange}
              min={1}
              max={10}
              step={1}
              disabled={saving}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm">
            <p className="text-foreground">
              When your balance reaches{' '}
              <strong>
                {pendingThreshold} hour{pendingThreshold !== 1 ? 's' : ''}
              </strong>
              , we'll automatically purchase the{' '}
              <strong>{selectedPack?.label}</strong> (${price}) using your saved
              payment method.
            </p>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Your saved payment method on file will be charged automatically.
          </p>

          {isDirty && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs text-foreground flex-1">
                You have unsaved changes.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDiscardChanges}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmChanges}
                disabled={saving}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {saving ? 'Saving…' : 'Confirm'}
              </Button>
            </div>
          )}

          {lastRenewalAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-secondary" />
              Last auto-renewal: {new Date(lastRenewalAt).toLocaleDateString()}
            </div>
          )}

          {lastRenewalError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                  <span className="font-medium">Last renewal failed: </span>
                  {lastRenewalError}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                onClick={handleRetry}
                disabled={retrying}
              >
                <RotateCcw
                  className={`h-3.5 w-3.5 mr-1.5 ${retrying ? 'animate-spin' : ''}`}
                />
                {retrying ? 'Retrying…' : 'Retry Now'}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
