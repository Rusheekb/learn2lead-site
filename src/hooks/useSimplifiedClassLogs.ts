import { useState, useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeManager } from './useRealtimeManager';
import { useAuth } from '@/contexts/AuthContext';
import { transformDbRecordToClassEvent } from '@/services/utils/classEventMapper';

export const useSimplifiedClassLogs = () => {
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
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
      
      // Transform database records to ClassEvent format
      return data ? data.map(record => transformDbRecordToClassEvent(record)) : [];
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

  // Mock filter functions
  const filteredClasses = classes.filter(c => 
    (!searchTerm || c.title?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!statusFilter || c.status === statusFilter) &&
    (!subjectFilter || c.subject === subjectFilter)
  );

  const totalItems = filteredClasses.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize);

  const formatTime = (time: string) => time;
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSubjectFilter('');
    setDateFilter(null);
  };

  return {
    // Core data
    classes,
    selectedClass,
    showDetails,
    isLoading: false,
    error: null,
    
    // Filters
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    subjectFilter,
    setSubjectFilter,
    dateFilter,
    setDateFilter,
    clearFilters,
    
    // Details dialog
    isDetailsOpen: showDetails,
    setIsDetailsOpen: setShowDetails,
    activeDetailsTab,
    setActiveDetailsTab,
    studentUploads: [],
    studentMessages: [],
    
    // Pagination
    filteredClasses,
    paginatedClasses,
    allSubjects: [],
    page,
    pageSize,
    totalPages,
    totalItems,
    
    // Handlers
    handleSelectClass,
    handleClassClick: handleSelectClass,
    handleCloseDetails,
    refreshData,
    handleRefreshData: refreshData,
    handlePageChange: setPage,
    handlePageSizeChange: setPageSize,
    formatTime,
    handleDownloadFile: () => {},
  };
};