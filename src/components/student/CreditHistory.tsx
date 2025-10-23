import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, TrendingDown, TrendingUp, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreditHistory = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('class_credits_ledger')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;

        setTransactions((data || []) as CreditTransaction[]);
      } catch (err) {
        console.error('Error fetching credit history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load credit history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditHistory();
  }, [user?.id]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Credit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No credit transactions yet. Complete a class to see your history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Credit History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recent transactions (last 20)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const isDebit = transaction.transaction_type === 'debit';
            
            return (
              <div
                key={transaction.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border',
                  'transition-colors hover:bg-accent/5'
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={cn(
                      'rounded-full p-2',
                      isDebit ? 'bg-destructive/10' : 'bg-primary/10'
                    )}
                  >
                    {isDebit ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {transaction.reason}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        isDebit ? 'text-destructive' : 'text-primary'
                      )}
                    >
                      {isDebit ? '' : '+'}
                      {transaction.amount} {Math.abs(transaction.amount) === 1 ? 'class' : 'classes'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: {transaction.balance_after}
                    </p>
                  </div>
                  
                  <Badge
                    variant={isDebit ? 'destructive' : 'default'}
                    className="capitalize"
                  >
                    {transaction.transaction_type}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {transactions.length === 20 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing most recent 20 transactions
          </p>
        )}
      </CardContent>
    </Card>
  );
};
