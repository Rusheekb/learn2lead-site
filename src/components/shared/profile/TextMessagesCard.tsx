import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchMyPhone,
  smsVerification,
} from '@/services/notifications/preferences';

/** Shown next to the consent checkbox; stored with the opt-in on the server. */
export const SMS_CONSENT_TEXT =
  'I agree to receive text messages from Learn2Lead about my classes, messages and account. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.';

const formatPhone = (e164: string) => {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
};

/**
 * A mobile number for text messages: enter it, agree to texts, confirm the
 * code we send. Which notifications come by text is chosen above.
 */
const TextMessagesCard: React.FC<{ userId: string }> = ({ userId }) => {
  const queryClient = useQueryClient();
  const { data: phone, isLoading } = useQuery({
    queryKey: ['my-phone', userId],
    queryFn: () => fetchMyPhone(userId),
  });
  const [number, setNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['my-phone', userId] });

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return setError('Please agree to receive text messages.');
    setBusy(true);
    setError(null);
    const result = await smsVerification('start', { phone: number, consent });
    setBusy(false);
    if (!result.success) return setError(result.error ?? 'Could not send.');
    setSentTo(result.phone ?? number);
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await smsVerification('confirm', { code });
    setBusy(false);
    if (!result.success)
      return setError(result.error ?? 'That code isn’t right.');
    toast.success('Mobile number verified. Choose which texts you want above.');
    setSentTo(null);
    setCode('');
    await refresh();
  };

  const remove = async () => {
    setBusy(true);
    await smsVerification('remove');
    setBusy(false);
    toast.success('Mobile number removed. Texts are off.');
    await refresh();
  };

  if (isLoading) return null;

  return (
    <div className="px-6 py-5 space-y-3">
      <div className="flex items-center gap-3">
        <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm font-medium">Mobile number</p>
      </div>

      {phone?.verified && !sentTo ? (
        <div className="pl-7 space-y-2">
          <p className="text-sm">
            {formatPhone(phone.value)}{' '}
            <span className="text-xs text-muted-foreground">
              {phone.optedOut
                ? '· texts paused (you replied STOP)'
                : '· verified'}
            </span>
          </p>
          <Button size="sm" variant="outline" onClick={remove} disabled={busy}>
            Remove number
          </Button>
        </div>
      ) : sentTo ? (
        <form onSubmit={confirm} noValidate className="pl-7 space-y-2">
          <Label htmlFor="sms-code">
            Enter the 6-digit code we texted to {formatPhone(sentTo)}
          </Label>
          <div className="flex gap-2 max-w-xs">
            <Input
              id="sms-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={busy || code.length < 6}>
              Verify
            </Button>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setSentTo(null)}
          >
            Use a different number
          </button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={start} noValidate className="pl-7 space-y-3">
          <div className="flex gap-2 max-w-sm">
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(512) 555-0100"
              aria-label="Mobile number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={busy || !number.trim()}>
              Send code
            </Button>
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground max-w-xl">
            <Checkbox
              checked={consent}
              onCheckedChange={(c) => setConsent(c === true)}
              aria-label="Agree to receive text messages"
              className="mt-0.5"
            />
            <span>{SMS_CONSENT_TEXT}</span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
};

export default TextMessagesCard;
