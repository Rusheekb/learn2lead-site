import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { transformDbRecordToClassEvent } from '@/services/utils/classEventMapper';
import { updatePaymentDate } from '@/services/class-operations/update/updatePaymentDate';
import { createClassLog, updateClassLog, deleteClassLog } from '@/services/classLogsService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useDebounce } from './useDebounce';
import { logger } from '@/lib/logger';

const log = logger.create('useClassLogs');

/** Unified query keys for class logs */
export const classLogsKeys = {
  all: ['class-logs'] as const,
  lists: () => [...classLogsKeys.all] as const,
  page: (page: number, pageSize: number, filters: Record<string, unknown>) =>
    [...classLogsKeys.all, 'page', { page, pageSize, ...filters }] as const,
  summary: () => [...classLogsKeys.all, 'summary'] as const,
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

/** Fetch all records in batches to bypass the 1000-row Supabase limit */
async function fetchAllBatched(): Promise<ClassEvent[]> {
  const batchSize = 1000;
  const allRecords: ClassEvent[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('class_logs')
      .select('*')
      .order('Date', { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) throw error;

    const batch = (data || []).map(record => transformDbRecordToClassEvent(record));
    allRecords.push(...batch);
    hasMore = (data?.length || 0) === batchSize;
    from += batchSize;
  }

  return allRecords;
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
    placeholderData: (prev) => prev, // keep previous data while loading next page
  });

  const paginatedClasses = paginatedData?.records || [];
  const totalItems = paginatedData?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // ─── All records query for summaries, totals & export (batched) ──────
  const { data: allClassesRaw = [] } = useQuery({
    queryKey: classLogsKeys.summary(),
    queryFn: fetchAllBatched,
    staleTime: 60_000, // 1 min — summaries don't need to be instant
  });

  // Apply client-side filters on the full dataset for totals/export
  const filteredClasses = useMemo(() => {
    return allClassesRaw.filter(c => {
      if (debouncedSearch) {
        const terms = debouncedSearch.split(/[,&]/).map(t => t.trim().toLowerCase()).filter(Boolean);
        const searchableText = [c.title, c.tutorName, c.studentName, c.subject]
          .filter(Boolean)
          .map(s => s!.toLowerCase());
        const allMatch = terms.every(term =>
          searchableText.some(field => field.includes(term))
        );
        if (!allMatch) return false;
      }

      if (dateFilter) {
        const classDate = c.date instanceof Date ? c.date : new Date(c.date);
        if (classDate.toDateString() !== dateFilter.toDateString()) return false;
      }

      if (paymentFilter) {
        switch (paymentFilter) {
          case 'student_unpaid': if (c.studentPaymentDate) return false; break;
          case 'student_paid': if (!c.studentPaymentDate) return false; break;
          case 'tutor_unpaid': if (c.tutorPaymentDate) return false; break;
          case 'tutor_paid': if (!c.tutorPaymentDate) return false; break;
        }
      }

      if (paymentMethodFilter && c.studentName) {
        const method = studentPaymentMethods[c.studentName] || 'zelle';
        if (method !== paymentMethodFilter) return false;
      }

      return true;
    });
  }, [allClassesRaw, debouncedSearch, dateFilter, paymentFilter, paymentMethodFilter]);

  // ─── Student payment methods ─────────────────────────────────────────
  const { data: studentPaymentMethods = {} } = useQuery({
    queryKey: ['student-payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('name, payment_method');
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s: any) => {
        map[s.name] = s.payment_method || 'zelle';
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

  // ─── CRUD mutations ──────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createClassLog,
    onSuccess: () => {
      toast.success('Class log created successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.all });
    },
    onError: (error) => {
      toast.error(`Failed to create class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; classEvent: Partial<ClassEvent> }) => {
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
      if (classEvent.classCost !== undefined) dbUpdates['Class Cost'] = classEvent.classCost?.toString();
      if (classEvent.tutorCost !== undefined) dbUpdates['Tutor Cost'] = classEvent.tutorCost?.toString();
      if (classEvent.notes !== undefined) dbUpdates['Additional Info'] = classEvent.notes;
      return updateClassLog(id, dbUpdates);
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
    mutationFn: deleteClassLog,
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

  const allSubjects = useMemo(() =>
    Array.from(new Set(allClassesRaw.map(cls => cls.subject || '')))
      .filter(s => s.trim() !== ''),
    [allClassesRaw]
  );

  const formatTime = (time: string) => time;
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter(null);
    setPaymentFilter('');
    setPaymentMethodFilter('');
  };

  return {
    // All records (unfiltered) for TutorPaymentSummary
    classes: allClassesRaw,
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

    // Filtered results (all matching, for totals/export)
    filteredClasses,
    // Server-paginated results for table
    paginatedClasses,
    allSubjects,
    page,
    pageSize,
    totalPages,
    totalItems,

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
