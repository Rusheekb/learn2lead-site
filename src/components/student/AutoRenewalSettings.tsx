import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { STRIPE_PLAN_CONFIG, STRIPE_PLAN_PRICES } from '@/config/stripe';
import type { StripePlanKey } from '@/config/stripe';

interface AutoRenewalRow {
  id: string;
  student_id: string;
  enabled: boolean;
  renewal_pack: string;
  threshold: number;
  last_renewal_at: string | null;
  last_renewal_error: string | null;
}

const PACK_OPTIONS: { value: StripePlanKey; label: string; credits: number }[] = [
  { value: 'basic', label: '4 Credit Pack', credits: 4 },
  { value: 'standard', label: '8 Credit Pack', credits: 8 },
  { value: 'premium', label: '12 Credit Pack', credits: 12 },
];

export const AutoRenewalSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [renewalPack, setRenewalPack] = useState<StripePlanKey>('standard');
  const [threshold, setThreshold] = useState(1);
  const [lastRenewalAt, setLastRenewalAt] = useState<string | null>(null);
  const [lastRenewalError, setLastRenewalError] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);

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
        setLastRenewalAt(row.last_renewal_at);
        setLastRenewalError(row.last_renewal_error);
      }
    } catch (err) {
      console.error('Failed to load auto-renewal settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: Partial<{ enabled: boolean; renewal_pack: string; threshold: number }>) => {
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
      console.error('Failed to save auto-renewal settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    saveSettings({ enabled: checked, renewal_pack: renewalPack, threshold });
  };

  const handlePackChange = (value: string) => {
    const pack = value as StripePlanKey;
    setRenewalPack(pack);
    saveSettings({ renewal_pack: pack });
  };

  const handleThresholdChange = (value: number[]) => {
    setThreshold(value[0]);
  };

  const handleThresholdCommit = () => {
    saveSettings({ threshold });
  };

  const selectedPack = PACK_OPTIONS.find(p => p.value === renewalPack);
  const price = STRIPE_PLAN_PRICES[renewalPack];

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
          Automatically purchase credits when your balance gets low
        </CardDescription>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-5 pt-0">
          <div className="space-y-2">
            <Label htmlFor="renewal-pack">Credit Pack</Label>
            <Select value={renewalPack} onValueChange={handlePackChange} disabled={saving}>
              <SelectTrigger id="renewal-pack">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACK_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — ${STRIPE_PLAN_PRICES[opt.value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Renew when credits reach: <span className="font-bold text-primary">{threshold}</span></Label>
            <Slider
              value={[threshold]}
              onValueChange={handleThresholdChange}
              onValueCommit={handleThresholdCommit}
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
              When your balance reaches <strong>{threshold} credit{threshold !== 1 ? 's' : ''}</strong>, 
              we'll automatically purchase the{' '}
              <strong>{selectedPack?.label}</strong> (${price}) using your saved payment method.
            </p>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Your saved payment method on file will be charged automatically.
          </p>

          {lastRenewalAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-secondary" />
              Last auto-renewal: {new Date(lastRenewalAt).toLocaleDateString()}
            </div>
          )}

          {lastRenewalError && (
            <Badge variant="destructive" className="text-xs">
              Last renewal failed: {lastRenewalError}
            </Badge>
          )}
        </CardContent>
      )}
    </Card>
  );
};
