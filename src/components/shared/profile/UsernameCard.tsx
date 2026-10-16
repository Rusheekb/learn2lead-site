import React, { useState } from 'react';
import { toast } from 'sonner';
import { AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  USERNAME_STATUS_TEXT,
  useUsernameAvailability,
} from '@/hooks/useUsernameAvailability';
import { USERNAME_HINT } from '@/lib/validation';

interface UsernameCardProps {
  username: string;
  /** A parent-added student: the parent manages the username. */
  managed?: boolean;
  onChanged: () => void;
}

const SET_ERRORS: Record<string, string> = {
  taken: 'That username is taken.',
  invalid: USERNAME_HINT,
  reserved: 'That username is reserved.',
  managed_by_parent: 'Your parent manages your username.',
};

/** The person's username, which works on the login page like their email. */
const UsernameCard: React.FC<UsernameCardProps> = ({
  username,
  managed,
  onChanged,
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username);
  const [saving, setSaving] = useState(false);
  const status = useUsernameAvailability(editing ? value : '', username);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc('set_my_username', {
      p_username: value,
    });
    setSaving(false);
    const result = data as { success: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast.error(
        SET_ERRORS[result?.error ?? ''] ?? 'Could not change your username.'
      );
      return;
    }
    toast.success('Username updated');
    setEditing(false);
    onChanged();
  };

  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <AtSign className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Username</p>
          {editing ? (
            <div className="mt-2 space-y-1.5">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-label="New username"
                autoCapitalize="none"
                spellCheck={false}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {USERNAME_STATUS_TEXT[status] ?? USERNAME_HINT}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={save}
                  disabled={
                    saving ||
                    status !== 'available' ||
                    value.trim().toLowerCase() === username
                  }
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setValue(username);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mt-0.5">{username}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {managed
                  ? 'Your parent manages your username.'
                  : 'You can sign in with this or your email.'}
              </p>
            </>
          )}
        </div>
      </div>
      {!managed && !editing && (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Change
        </Button>
      )}
    </div>
  );
};

export default UsernameCard;
