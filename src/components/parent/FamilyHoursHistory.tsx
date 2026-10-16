import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  ChevronDown,
  FileText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { describeHoursActivity } from '@/lib/hours';
import { useFamilyHoursHistory } from '@/hooks/queries/useFamilyQueries';

/**
 * The family balance's history: purchases, each child's classes (named), and
 * adjustments. Same look as the student CreditHistory.
 */
const FamilyHoursHistory: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: entries = [], isLoading, error } = useFamilyHoursHistory();

  const countLabel =
    isLoading || error
      ? ''
      : entries.length === 0
        ? 'No activity'
        : `${entries.length}${entries.length === 50 ? '+' : ''} ${entries.length === 1 ? 'entry' : 'entries'}`;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setIsExpanded((e) => !e)}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">Family Hours History</span>
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
              <p className="text-sm">Failed to load your hours history</p>
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 px-4">
              No activity yet. Purchases and completed classes will appear here.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-border">
              {entries.map((e) => {
                const isDebit = e.amount < 0;
                return (
                  <li
                    key={e.id}
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
                      <p className="text-sm truncate">
                        {describeHoursActivity(e.reason)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(e.createdAt), 'MMM d, yyyy')}
                        {e.studentFirstName && isDebit
                          ? ` · ${e.studentFirstName}`
                          : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right whitespace-nowrap">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          isDebit ? 'text-destructive' : 'text-primary'
                        )}
                      >
                        {isDebit ? '−' : '+'}
                        {Math.abs(e.amount)}h
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bal: {e.balanceAfter}h
                      </p>
                    </div>
                    <Badge
                      variant={isDebit ? 'destructive' : 'default'}
                      className="shrink-0 text-xs"
                    >
                      {isDebit ? 'Used' : 'Added'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default FamilyHoursHistory;
