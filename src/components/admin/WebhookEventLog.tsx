import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

type EventStatus = 'received' | 'processed' | 'failed' | 'skipped';

interface WebhookEvent {
  id: string;
  stripe_event_id: string;
  event_type: string;
  status: EventStatus;
  error_message: string | null;
  is_test_event: boolean;
  created_at: string;
}

const STATUS_FILTERS: { label: string; value: EventStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Processed', value: 'processed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Received', value: 'received' },
  { label: 'Skipped', value: 'skipped' },
];

const statusBadge = (status: EventStatus) => {
  const variants: Record<EventStatus, { label: string; className: string }> = {
    processed: {
      label: 'Processed',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-800 border-red-200',
    },
    received: {
      label: 'Received',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    skipped: {
      label: 'Skipped',
      className: 'bg-gray-100 text-gray-600 border-gray-200',
    },
  };
  const v = variants[status] ?? variants.received;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${v.className}`}
    >
      {v.label}
    </span>
  );
};

const PAGE_SIZE = 30;

const WebhookEventLog: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['webhook-events', statusFilter, page],
    queryFn: async () => {
      let q = supabase
        .from('stripe_webhook_events' as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { events: (data ?? []) as WebhookEvent[], total: count ?? 0 };
    },
    staleTime: 15_000,
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleFilterChange = (value: EventStatus | 'all') => {
    setStatusFilter(value);
    setPage(0);
    setExpandedId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Stripe Webhook Events</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit log of every incoming Stripe event — use this to diagnose
            missing credits or failed payments.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleFilterChange(value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              statusFilter === value
                ? 'border-tutoring-blue text-tutoring-blue'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2 py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <AlertCircle className="h-8 w-8 opacity-30" />
          <p className="text-sm">No events found</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8" />
                <TableHead>Event type</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-20">Mode</TableHead>
                <TableHead className="w-44">Event ID</TableHead>
                <TableHead className="w-36">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const isOpen = expandedId === event.id;
                const hasError = !!event.error_message;
                return (
                  <React.Fragment key={event.id}>
                    <TableRow
                      className={`cursor-pointer hover:bg-muted/30 ${hasError ? 'bg-red-50/40' : ''}`}
                      onClick={() => setExpandedId(isOpen ? null : event.id)}
                    >
                      <TableCell className="py-2 pl-3 pr-0">
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-xs">
                        {event.event_type}
                      </TableCell>
                      <TableCell className="py-2">
                        {statusBadge(event.status)}
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={`text-xs font-medium ${event.is_test_event ? 'text-amber-600' : 'text-emerald-700'}`}
                        >
                          {event.is_test_event ? 'Test' : 'Live'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 font-mono text-xs text-muted-foreground truncate max-w-[160px]">
                        {event.stripe_event_id}
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        <span
                          title={format(new Date(event.created_at), 'PPpp')}
                        >
                          {formatDistanceToNow(new Date(event.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={6} className="py-3 px-4">
                          <div className="space-y-2 text-xs">
                            <div className="flex gap-8">
                              <div>
                                <span className="text-muted-foreground">
                                  Stripe event ID
                                </span>
                                <p className="font-mono mt-0.5">
                                  {event.stripe_event_id}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Received at
                                </span>
                                <p className="mt-0.5">
                                  {format(new Date(event.created_at), 'PPpp')}
                                </p>
                              </div>
                            </div>
                            {event.error_message && (
                              <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-3">
                                <p className="text-xs font-medium text-red-700 mb-1">
                                  Error
                                </p>
                                <pre className="text-xs text-red-600 whitespace-pre-wrap break-all font-mono">
                                  {event.error_message}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total.toLocaleString()} events total</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookEventLog;
