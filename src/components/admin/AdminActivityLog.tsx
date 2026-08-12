import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityEntry {
  id: string;
  action_type: string;
  description: string;
  entity_type: string | null;
  created_at: string;
  admin: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

const ACTION_COLORS: Record<string, string> = {
  payroll_processed: 'bg-emerald-500',
  credits_adjusted: 'bg-blue-500',
  referral_created: 'bg-violet-500',
  referral_toggled: 'bg-amber-500',
  rates_updated: 'bg-sky-500',
  role_changed: 'bg-orange-500',
};

const AdminActivityLog: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin-activity-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_activity_log' as any)
        .select(
          `
          id, action_type, description, entity_type, created_at,
          admin:profiles!admin_activity_log_admin_id_fkey(first_name, last_name, email)
        `
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as unknown as ActivityEntry[];
    },
    staleTime: 30_000,
  });

  const visible = expanded ? entries : entries.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Admin Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No admin actions recorded yet.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              {visible.map((entry) => {
                const dot = ACTION_COLORS[entry.action_type] ?? 'bg-gray-400';
                const adminName = entry.admin
                  ? [entry.admin.first_name, entry.admin.last_name]
                      .filter(Boolean)
                      .join(' ') || entry.admin.email
                  : 'Admin';
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 py-2 border-b last:border-0"
                  >
                    <div
                      className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dot}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {adminName} ·{' '}
                        {formatDistanceToNow(new Date(entry.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {entries.length > 5 && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    expanded && 'rotate-180'
                  )}
                />
                {expanded ? 'Show less' : `Show ${entries.length - 5} more`}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminActivityLog;
