import { useState, useEffect, useCallback } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeManager } from './useRealtimeManager';
import { useAuth } from '@/contexts/AuthContext';
import { transformDbRecordToClassEvent } from '@/services/utils/classEventMapper';
import { updatePaymentDate } from '@/services/class-operations/update/updatePaymentDate';
import { toast } from 'sonner';

export const useSimplifiedClassLogs = () => {
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
  const { data: classData, refetch } = useQuery({
    queryKey: ['class-logs'],
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
    queryClient.invalidateQueries({ queryKey: ['class-logs'] });
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
    // Search filter (supports comma/& separated AND terms)
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

    // Date filter
    if (dateFilter) {
      const classDate = c.date instanceof Date ? c.date : new Date(c.date);
      if (classDate.toDateString() !== dateFilter.toDateString()) return false;
    }

    // Payment status filter
    if (paymentFilter) {
      switch (paymentFilter) {
        case 'student_unpaid': if (c.studentPaymentDate) return false; break;
        case 'student_paid': if (!c.studentPaymentDate) return false; break;
        case 'tutor_unpaid': if (c.tutorPaymentDate) return false; break;
        case 'tutor_paid': if (!c.tutorPaymentDate) return false; break;
      }
    }

    // Payment method filter
    if (paymentMethodFilter && c.studentName) {
      const method = studentPaymentMethods[c.studentName] || 'zelle';
      if (method !== paymentMethodFilter) return false;
    }

    return true;
  });

  const totalItems = filteredClasses.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize);

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
    isLoading: false,
    error: null,
    
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
    allSubjects: [],
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
  };
};
