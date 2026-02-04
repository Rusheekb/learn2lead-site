import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UsageHistory {
  usedAt: string;
  usedByEmail: string;
}

interface ReferralStatsProps {
  timesUsed: number;
  totalEarnings: number;
  usageHistory: UsageHistory[];
  createdAt?: string;
}

const ReferralStats: React.FC<ReferralStatsProps> = ({
  timesUsed,
  totalEarnings,
  usageHistory,
  createdAt,
}) => {
  // Calculate conversion rate (placeholder - would need click data)
  const conversionRate = timesUsed > 0 ? 'Active' : 'Share to start';

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{timesUsed}</p>
            <p className="text-xs text-muted-foreground">Friends Referred</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="pt-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">${totalEarnings}</p>
            <p className="text-xs text-muted-foreground">Credits Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-lg font-semibold">{conversionRate}</p>
            <p className="text-xs text-muted-foreground">Status</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-lg font-semibold">
              {createdAt
                ? formatDistanceToNow(new Date(createdAt), { addSuffix: false })
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Code Age</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals */}
      {usageHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Referrals</h4>
          <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
            {usageHistory.slice(0, 10).map((usage, index) => (
              <div
                key={index}
                className="p-3 flex justify-between items-center text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {usage.usedByEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {usage.usedByEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium">+$25</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(usage.usedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {usageHistory.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No referrals yet</p>
          <p className="text-xs">Share your code to start earning!</p>
        </div>
      )}
    </div>
  );
};

export default ReferralStats;
