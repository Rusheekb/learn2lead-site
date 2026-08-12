import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns';

interface MonthBucket {
  label: string; // "Jan", "Feb", …
  yearMonth: string; // "2026-01"
  revenue: number;
}

const RevenueOverview: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue-overview'],
    queryFn: async () => {
      // Pull all credit purchases with a dollar amount from the last 6 months
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

      const { data: rows, error } = await supabase
        .from('class_credits_ledger')
        .select('dollar_amount, created_at')
        .eq('transaction_type', 'credit')
        .not('dollar_amount', 'is', null)
        .gte('created_at', sixMonthsAgo.toISOString());

      if (error) throw error;

      // Build 6-month buckets
      const buckets: MonthBucket[] = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return {
          label: format(d, 'MMM'),
          yearMonth: format(d, 'yyyy-MM'),
          revenue: 0,
        };
      });

      for (const row of rows ?? []) {
        const ym = (row.created_at ?? '').slice(0, 7); // "2026-01"
        const bucket = buckets.find((b) => b.yearMonth === ym);
        if (bucket) bucket.revenue += Number(row.dollar_amount);
      }

      return buckets;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  const buckets = data ?? [];
  const thisMonth = buckets[5]?.revenue ?? 0;
  const lastMonth = buckets[4]?.revenue ?? 0;
  const allTime = buckets.reduce((s, b) => s + b.revenue, 0);
  const maxRevenue = Math.max(...buckets.map((b) => b.revenue), 1);

  const momDelta =
    lastMonth === 0 ? null : ((thisMonth - lastMonth) / lastMonth) * 100;

  const Trend =
    momDelta === null
      ? null
      : momDelta > 0
        ? TrendingUp
        : momDelta < 0
          ? TrendingDown
          : Minus;

  const trendColor =
    momDelta === null
      ? ''
      : momDelta > 0
        ? 'text-emerald-600'
        : momDelta < 0
          ? 'text-red-500'
          : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Revenue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Metric cells */}
        <div className="grid grid-cols-3 divide-x divide-border border rounded-lg overflow-hidden">
          <MetricCell
            label="This month"
            value={`$${thisMonth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            sub={
              Trend && momDelta !== null ? (
                <span className={`flex items-center gap-0.5 ${trendColor}`}>
                  <Trend className="h-3 w-3" />
                  {Math.abs(momDelta).toFixed(0)}% vs last month
                </span>
              ) : (
                <span className="text-muted-foreground">
                  No prior month data
                </span>
              )
            }
          />
          <MetricCell
            label="Last month"
            value={`$${lastMonth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            sub={
              <span className="text-muted-foreground">{buckets[4]?.label}</span>
            }
          />
          <MetricCell
            label="6-month total"
            value={`$${allTime.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            sub={<span className="text-muted-foreground">last 6 months</span>}
          />
        </div>

        {/* Bar chart */}
        <div>
          <div className="flex items-end gap-2 h-28">
            {buckets.map((b, i) => {
              const heightPct =
                maxRevenue > 0 ? (b.revenue / maxRevenue) * 100 : 0;
              const isCurrent = i === 5;
              return (
                <div
                  key={b.yearMonth}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    $
                    {b.revenue.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <div
                    className="w-full flex items-end"
                    style={{ height: '80px' }}
                  >
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isCurrent
                          ? 'bg-tutoring-blue'
                          : 'bg-tutoring-blue/30 group-hover:bg-tutoring-blue/50'
                      }`}
                      style={{
                        height: `${Math.max(heightPct, b.revenue > 0 ? 4 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-1">
            {buckets.map((b) => (
              <div key={b.yearMonth} className="flex-1 text-center">
                <span className="text-xs text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MetricCell: React.FC<{
  label: string;
  value: string;
  sub: React.ReactNode;
}> = ({ label, value, sub }) => (
  <div className="flex flex-col items-center justify-center gap-0.5 py-4 px-3 text-center">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold tabular-nums">{value}</p>
    <div className="text-xs mt-0.5">{sub}</div>
  </div>
);

export default RevenueOverview;
