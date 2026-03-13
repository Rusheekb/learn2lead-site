import { useState, useEffect, useCallback } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeManager } from './useRealtimeManager';
import { useAuth } from '@/contexts/AuthContext';
import { transformDbRecordToClassEvent } from '@/services/utils/classEventMapper';
import { updatePaymentDate } from '@/services/class-operations/update/updatePaymentDate';
import { createClassLog, updateClassLog, deleteClassLog } from '@/services/classLogsService';
import { toast } from 'sonner';
import { format } from 'date-fns';

/** Unified query key for class logs */
export const classLogsKeys = {
  all: ['class-logs'] as const,
  lists: () => [...classLogsKeys.all] as const,
  detail: (id: string) => [...classLogsKeys.all, 'detail', id] as const,
};

export const useClassLogs = () => {
  const [classes, setClasses] = useState<ClassEvent[]>([]);
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

  // Fetch class logs
  const { data: classData, isLoading, error, refetch } = useQuery({
    queryKey: classLogsKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_logs')
        .select('*')
        .order('Date', { ascending: false });
      
      if (error) throw error;
      return data ? data.map(record => transformDbRecordToClassEvent(record)) : [];
    },
  });

  // Fetch student payment methods
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

  // Set up realtime subscriptions
  useRealtimeManager({
    userId: user?.id,
    userRole: user?.user_metadata?.role,
    setClasses,
  });

  useEffect(() => {
    if (classData) {
      setClasses(classData);
    }
  }, [classData]);

  // CRUD mutations
  const createMutation = useMutation({
    mutationFn: createClassLog,
    onSuccess: () => {
      toast.success('Class log created successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: classLogsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to update class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClassLog,
    onSuccess: () => {
      toast.success('Class log deleted successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to delete class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const handleSelectClass = (classEvent: ClassEvent) => {
    setSelectedClass(classEvent);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedClass(null);
  };

  const refreshData = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: classLogsKeys.lists() });
  };

  // Payment toggle handlers
  const handleToggleStudentPayment = useCallback(async (classId: string, currentlyPaid: boolean) => {
    const newDate = currentlyPaid ? null : new Date();
    const ok = await updatePaymentDate(classId, 'student_payment_date', newDate);
    if (ok) {
      toast.success(currentlyPaid ? 'Student payment marked as unpaid' : 'Student payment marked as paid');
      refreshData();
    } else {
      toast.error('Failed to update student payment');
    }
  }, []);

  const handleToggleTutorPayment = useCallback(async (classId: string, currentlyPaid: boolean) => {
    const newDate = currentlyPaid ? null : new Date();
    const ok = await updatePaymentDate(classId, 'tutor_payment_date', newDate);
    if (ok) {
      toast.success(currentlyPaid ? 'Tutor payment marked as unpaid' : 'Tutor payment marked as paid');
      refreshData();
    } else {
      toast.error('Failed to update tutor payment');
    }
  }, []);

  // Filter classes
  const filteredClasses = classes.filter(c => {
    if (searchTerm) {
      const terms = searchTerm.split(/[,&]/).map(t => t.trim().toLowerCase()).filter(Boolean);
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

  const totalItems = filteredClasses.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize);

  const allSubjects = Array.from(new Set(classes.map((cls) => cls.subject || '')))
    .filter(subject => subject.trim() !== '');

  const formatTime = (time: string) => time;
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter(null);
    setPaymentFilter('');
    setPaymentMethodFilter('');
  };

  return {
    classes,
    selectedClass,
    showDetails,
    isLoading: isLoading,
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
    
    filteredClasses,
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
