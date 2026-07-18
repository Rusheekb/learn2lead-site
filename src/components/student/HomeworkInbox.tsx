import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookMarked, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import { cn } from '@/lib/utils';

interface HWItem {
  id: string;
  Date: string;
  Subject: string | null;
  'Tutor Name': string | null;
  HW: string;
  'Class Number': string | null;
}

const HomeworkInbox: React.FC = () => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: items = [], isLoading } = useQuery<HWItem[]>({
    queryKey: ['homework-inbox', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_logs')
        .select('id, Date, Subject, "Tutor Name", HW, "Class Number"')
        .not('HW', 'is', null)
        .neq('HW', '')
        .order('Date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as HWItem[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const pendingCount = items.length;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setIsExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookMarked className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">Homework</span>
          {!isLoading && pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
              {pendingCount}
            </Badge>
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
        <div className="border-t divide-y divide-border/50">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No homework assigned yet.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {item.Subject && (
                      <Badge variant="outline" className="text-xs">
                        {item.Subject}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(parseDateToLocal(item.Date), 'MMM d, yyyy')}
                    </span>
                    {item['Tutor Name'] && (
                      <span className="text-xs text-muted-foreground">
                        · {item['Tutor Name']}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{item.HW}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HomeworkInbox;
