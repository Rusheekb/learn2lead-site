import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

const log = logger.create('CreditHistory');

interface CreditTransaction {
  id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  reason: string;
  related_class_id: string | null;
  created_at: string;
}

export const CreditHistory: React.FC = () => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    data: transactions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['credit-history', user?.id],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('class_credits_ledger')
        .select('*')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        log.error('Error fetching credit history', fetchError);
        throw fetchError;
      }

      return (data || []) as CreditTransaction[];
    },
    enabled: !!user?.id,
  });

  const countLabel = isLoading
    ? ''
    : error
      ? ''
      : transactions.length === 0
        ? 'No transactions'
        : `${transactions.length}${transactions.length === 50 ? '+' : ''} transaction${transactions.length !== 1 ? 's' : ''}`;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Always-visible toggle header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setIsExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">Credit History</span>
          {countLabel && (
            <span className="text-xs text-muted-foreground">
              ({countLabel})
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="border-t">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive p-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">Failed to load credit history</p>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 px-4">
              No credit transactions yet. Complete a class to see your history
              here.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {transactions.map((t) => {
                const isDebit = t.transaction_type === 'debit';
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div
                      className={cn(
                        'rounded-full p-1.5 shrink-0',
                        isDebit ? 'bg-destructive/10' : 'bg-primary/10'
                      )}
                    >
                      {isDebit ? (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{t.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>

                    <div className="shrink-0 text-right whitespace-nowrap">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          isDebit ? 'text-destructive' : 'text-primary'
                        )}
                      >
                        {isDebit ? '' : '+'}
                        {t.amount}h
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bal: {t.balance_after}
                      </p>
                    </div>

                    <Badge
                      variant={isDebit ? 'destructive' : 'default'}
                      className="shrink-0 text-xs capitalize"
                    >
                      {t.transaction_type === 'credit' ? 'Credit' : 'Debit'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && !error && transactions.length === 50 && (
            <p className="text-xs text-muted-foreground text-center py-2 border-t">
              Showing most recent 50 transactions
            </p>
          )}
        </div>
      )}
    </div>
  );
};
