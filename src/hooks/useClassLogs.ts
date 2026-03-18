import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { transformDbRecordToClassEvent } from '@/services/utils/classEventMapper';
import { updatePaymentDate } from '@/services/class-operations/update/updatePaymentDate';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useDebounce } from './useDebounce';
import { formatDateForDatabase } from '@/utils/safeDateUtils';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import { logger } from '@/lib/logger';

const log = logger.create('useClassLogs');

/** Unified query keys for class logs */
export const classLogsKeys = {
  all: ['class-logs'] as const,
  lists: () => [...classLogsKeys.all] as const,
  page: (page: number, pageSize: number, filters: Record<string, unknown>) =>
    [...classLogsKeys.all, 'page', { page, pageSize, ...filters }] as const,
  totals: (filters: Record<string, unknown>) =>
    [...classLogsKeys.all, 'totals', filters] as const,
  export: () => [...classLogsKeys.all, 'export'] as const,
  detail: (id: string) => [...classLogsKeys.all, 'detail', id] as const,
};

/** Apply server-side filters to a Supabase query builder */
function applyServerFilters(
  query: any,
  filters: { searchTerm: string; dateFilter: Date | null; paymentFilter: string }
) {
  const { searchTerm, dateFilter, paymentFilter } = filters;

  if (dateFilter) {
    query = query.eq('Date', format(dateFilter, 'yyyy-MM-dd'));
  }

  if (paymentFilter) {
    switch (paymentFilter) {
      case 'student_unpaid':
        query = query.is('student_payment_date', null);
        break;
      case 'student_paid':
        query = query.not('student_payment_date', 'is', null);
        break;
      case 'tutor_unpaid':
        query = query.is('tutor_payment_date', null);
        break;
      case 'tutor_paid':
        query = query.not('tutor_payment_date', 'is', null);
        break;
    }
  }

  if (searchTerm) {
    const terms = searchTerm.split(/[,&]/).map(t => t.trim()).filter(Boolean);
    for (const term of terms) {
      const pattern = `%${term}%`;
      query = query.or(
        `Class Number.ilike.${pattern},Tutor Name.ilike.${pattern},Student Name.ilike.${pattern},Subject.ilike.${pattern},Title.ilike.${pattern}`
      );
    }
  }

  return query;
}

/** Fetch all records in batches (only used for CSV export, triggered on demand) */
async function fetchAllBatched(filters: {
  searchTerm: string;
  dateFilter: Date | null;
  paymentFilter: string;
}): Promise<ClassEvent[]> {
  const batchSize = 1000;
  const allRecords: ClassEvent[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('class_logs')
      .select('*')
      .order('Date', { ascending: false })
      .order('Time (CST)', { ascending: false })
      .range(from, from + batchSize - 1);

    query = applyServerFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;

    const batch = (data || []).map(record => transformDbRecordToClassEvent(record));
    allRecords.push(...batch);
    hasMore = (data?.length || 0) === batchSize;
    from += batchSize;
  }

  return allRecords;
}

export interface ClassLogTotals {
  totalClassCost: number;
  totalTutorCost: number;
  pendingStudent: number;
  pendingTutor: number;
  totalCount: number;
}

export const useClassLogs = () => {
  const [selectedClass, setSelectedClass] = useState<ClassEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [activeDetailsTab, setActiveDetailsTab] = useState('details');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Debounce search to avoid excessive queries
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Stable filter object for query keys
  const serverFilters = useMemo(() => ({
    searchTerm: debouncedSearch,
    dateFilter: dateFilter ? format(dateFilter, 'yyyy-MM-dd') : null,
    paymentFilter,
  }), [debouncedSearch, dateFilter, paymentFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFilter, paymentFilter, paymentMethodFilter]);

  // ─── Paginated query for table display ───────────────────────────────
  const { data: paginatedData, isLoading, error, refetch } = useQuery({
    queryKey: classLogsKeys.page(page, pageSize, serverFilters),
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('class_logs')
        .select('*', { count: 'exact' })
        .order('Date', { ascending: false })
        .order('Time (CST)', { ascending: false })
        .range(from, to);

      query = applyServerFilters(query, {
        searchTerm: debouncedSearch,
        dateFilter,
        paymentFilter,
      });

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        records: (data || []).map(record => transformDbRecordToClassEvent(record)),
        totalCount: count || 0,
      };
    },
    placeholderData: (prev) => prev,
  });

  const paginatedClasses = paginatedData?.records || [];
  const totalItems = paginatedData?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // ─── Aggregate totals via RPC (no full-table download) ───────────────
  const { data: totals } = useQuery<ClassLogTotals>({
    queryKey: classLogsKeys.totals(serverFilters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_class_log_totals', {
        p_search: debouncedSearch || undefined,
        p_date: dateFilter ? format(dateFilter, 'yyyy-MM-dd') : undefined,
        p_payment_filter: paymentFilter || undefined,
      });
      if (error) throw error;
      const result = data as any;
      return {
        totalClassCost: Number(result?.total_class_cost ?? 0),
        totalTutorCost: Number(result?.total_tutor_cost ?? 0),
        pendingStudent: Number(result?.pending_student ?? 0),
        pendingTutor: Number(result?.pending_tutor ?? 0),
        totalCount: Number(result?.total_count ?? 0),
      };
    },
    staleTime: 30_000,
  });

  // ─── Lazy-loaded export query (only fetches when triggered) ──────────
  const {
    data: exportData,
    refetch: fetchExportData,
    isFetching: isExportLoading,
  } = useQuery({
    queryKey: classLogsKeys.export(),
    queryFn: () => fetchAllBatched({
      searchTerm: debouncedSearch,
      dateFilter,
      paymentFilter,
    }),
    enabled: false, // Only fetch on demand
  });

  // ─── Student payment methods ─────────────────────────────────────────
  const { data: studentPaymentMethods = {} } = useQuery({
    queryKey: ['student-payment-methods'],
    queryFn: async () => {
      // Fetch students and profiles to map profile ID -> payment_method
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select('email, payment_method');
      if (sErr) throw sErr;

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'student');
      if (pErr) throw pErr;

      // Build email -> payment_method, then profileId -> payment_method
      const emailToMethod: Record<string, string> = {};
      students?.forEach((s: any) => {
        if (s.email) emailToMethod[s.email] = s.payment_method || 'zelle';
      });

      const map: Record<string, string> = {};
      profiles?.forEach((p: any) => {
        if (p.email && emailToMethod[p.email]) {
          map[p.id] = emailToMethod[p.email];
        }
      });
      return map;
    },
  });

  // ─── Realtime: invalidate queries on changes ─────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('class-logs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ─── CRUD mutations (inlined, no service middleman) ──────────────────
  const createMutation = useMutation({
    mutationFn: async (classEvent: ClassEvent) => {
      const eventDate = parseDateToLocal(classEvent.date);
      const record: Record<string, any> = {
        'Class Number': classEvent.title,
        'Tutor Name': classEvent.tutorName,
        'Student Name': classEvent.studentName,
        Date: formatDateForDatabase(eventDate),
        Day: format(eventDate, 'EEEE'),
        'Time (CST)': classEvent.startTime,
        'Time (hrs)': classEvent.duration?.toString() || '0',
        Subject: classEvent.subject,
        Content: classEvent.content || null,
        HW: classEvent.homework || null,
        'Class ID': classEvent.id,
        'Class Cost': classEvent.classCost ?? null,
        'Tutor Cost': classEvent.tutorCost ?? null,
        'Additional Info': classEvent.notes || null,
      };

      if (classEvent.tutorId) record.tutor_user_id = classEvent.tutorId;
      if (classEvent.studentId) record.student_user_id = classEvent.studentId;

      const { data, error } = await supabase
        .from('class_logs')
        .insert(record as any)
        .select()
        .single();

      if (error) throw error;
      return data ? transformDbRecordToClassEvent(data) : null;
    },
    onSuccess: () => {
      toast.success('Class log created successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
    },
    onError: (error) => {
      toast.error(`Failed to create class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; classEvent: Partial<ClassEvent> }) => {
      const { id, classEvent } = params;
      const dbUpdates: Record<string, any> = {};
      if (classEvent.title !== undefined) dbUpdates['Class Number'] = classEvent.title;
      if (classEvent.tutorName !== undefined) dbUpdates['Tutor Name'] = classEvent.tutorName;
      if (classEvent.studentName !== undefined) dbUpdates['Student Name'] = classEvent.studentName;
      if (classEvent.date !== undefined) {
        dbUpdates['Date'] = classEvent.date instanceof Date
          ? format(classEvent.date, 'yyyy-MM-dd')
          : classEvent.date;
      }
      if (classEvent.startTime !== undefined) dbUpdates['Time (CST)'] = classEvent.startTime;
      if (classEvent.duration !== undefined) dbUpdates['Time (hrs)'] = classEvent.duration.toString();
      if (classEvent.subject !== undefined) dbUpdates['Subject'] = classEvent.subject;
      if (classEvent.content !== undefined) dbUpdates['Content'] = classEvent.content;
      if (classEvent.homework !== undefined) dbUpdates['HW'] = classEvent.homework;
      if (classEvent.classCost !== undefined) dbUpdates['Class Cost'] = classEvent.classCost;
      if (classEvent.tutorCost !== undefined) dbUpdates['Tutor Cost'] = classEvent.tutorCost;
      if (classEvent.notes !== undefined) dbUpdates['Additional Info'] = classEvent.notes;

      const { data, error } = await supabase
        .from('class_logs')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data ? transformDbRecordToClassEvent(data) : null;
    },
    onSuccess: () => {
      toast.success('Class log updated successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
    },
    onError: (error) => {
      toast.error(`Failed to update class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success('Class log deleted successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
    },
    onError: (error) => {
      toast.error(`Failed to delete class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // ─── UI handlers ─────────────────────────────────────────────────────
  const handleSelectClass = (classEvent: ClassEvent) => {
    setSelectedClass(classEvent);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedClass(null);
  };

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
  }, [queryClient]);

  const handleToggleStudentPayment = useCallback(async (classId: string, currentlyPaid: boolean) => {
    const newDate = currentlyPaid ? null : new Date();
    const ok = await updatePaymentDate(classId, 'student_payment_date', newDate);
    if (ok) {
      toast.success(currentlyPaid ? 'Student payment marked as unpaid' : 'Student payment marked as paid');
      refreshData();
    } else {
      toast.error('Failed to update student payment');
    }
  }, [refreshData]);

  const handleToggleTutorPayment = useCallback(async (classId: string, currentlyPaid: boolean) => {
    const newDate = currentlyPaid ? null : new Date();
    const ok = await updatePaymentDate(classId, 'tutor_payment_date', newDate);
    if (ok) {
      toast.success(currentlyPaid ? 'Tutor payment marked as unpaid' : 'Tutor payment marked as paid');
      refreshData();
    } else {
      toast.error('Failed to update tutor payment');
    }
  }, [refreshData]);

  const formatTime = (time: string) => time;
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter(null);
    setPaymentFilter('');
    setPaymentMethodFilter('');
  };

  return {
    selectedClass,
    showDetails,
    isLoading,
    error,

    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    paymentFilter,
    setPaymentFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    clearFilters,

    isDetailsOpen: showDetails,
    setIsDetailsOpen: setShowDetails,
    activeDetailsTab,
    setActiveDetailsTab,
    studentUploads: [],
    studentMessages: [],

    // Server-paginated results for table
    paginatedClasses,
    page,
    pageSize,
    totalPages,
    totalItems,

    // Aggregate totals from RPC (no full download)
    totals: totals || {
      totalClassCost: 0,
      totalTutorCost: 0,
      pendingStudent: 0,
      pendingTutor: 0,
      totalCount: 0,
    },

    // Lazy-loaded export
    exportData: exportData || [],
    fetchExportData,
    isExportLoading,

    handleSelectClass,
    handleClassClick: handleSelectClass,
    handleCloseDetails,
    refreshData,
    handleRefreshData: refreshData,
    handlePageChange: setPage,
    handlePageSizeChange: setPageSize,
    formatTime,
    handleDownloadFile: () => {},

    // Payment
    studentPaymentMethods,
    handleToggleStudentPayment,
    handleToggleTutorPayment,

    // CRUD mutations
    createClass: createMutation.mutate,
    updateClass: (id: string, classEvent: Partial<ClassEvent>) =>
      updateMutation.mutate({ id, classEvent }),
    deleteClass: deleteMutation.mutate,
    refetch: () => refetch(),
  };
};
