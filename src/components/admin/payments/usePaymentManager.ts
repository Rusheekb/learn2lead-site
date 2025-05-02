
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fetchPaymentsData } from '@/services/dataService';

interface Payment {
  id: string;
  date: string;
  tutorName: string;
  studentName: string;
  classCost: number;
  tutorCost: number;
  studentPaymentStatus: string;
  tutorPaymentStatus: string;
}

export const usePaymentManager = (classes: any[]) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadPayments = async () => {
      setIsLoading(true);
      try {
        const data = await fetchPaymentsData();
        setPayments(data);
        setFilteredPayments(data);
      } catch (error) {
        console.error('Error loading payments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (classes.length > 0) {
      loadPayments();
    }
  }, [classes]);

  useEffect(() => {
    // Apply filters whenever search term or status filter changes
    const filtered = payments.filter((payment) => {
      const matchesSearch =
        payment.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        payment.studentPaymentStatus.toLowerCase() ===
          statusFilter.toLowerCase() ||
        payment.tutorPaymentStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });

    setFilteredPayments(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, statusFilter, payments]);

  const formatDate = (dateStr: string) => {
    try {
      return dateStr ? format(new Date(dateStr), 'MMM d, yyyy') : 'N/A';
    } catch (e) {
      console.error('Error formatting date:', e, dateStr);
      return String(dateStr || 'N/A');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPaymentsData();
      setPayments(data);
      setFilteredPayments(data);
    } catch (error) {
      console.error('Error refreshing payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent +=
      'Class ID,Date,Tutor,Student,Class Cost,Tutor Cost,Student Payment,Tutor Payment\n';

    filteredPayments.forEach((payment) => {
      csvContent += `${payment.id},${payment.date},${payment.tutorName},${payment.studentName},${payment.classCost},${payment.tutorCost},${payment.studentPaymentStatus},${payment.tutorPaymentStatus}\n`;
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `payments_export_${format(new Date(), 'yyyy-MM-dd')}.csv`
    );
    document.body.appendChild(link);

    // Download file
    link.click();
    document.body.removeChild(link);
  };

  // Calculate paginated data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage));

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const calculateTotals = () => {
    const total = filteredPayments.reduce(
      (acc, payment) => {
        acc.classCost += payment.classCost;
        acc.tutorCost += payment.tutorCost;
        acc.profit += payment.classCost - payment.tutorCost;

        if (payment.studentPaymentStatus.toLowerCase() === 'paid') {
          acc.collected += payment.classCost;
        } else {
          acc.pending += payment.classCost;
        }

        return acc;
      },
      { classCost: 0, tutorCost: 0, profit: 0, collected: 0, pending: 0 }
    );

    return total;
  };

  return {
    filteredPayments,
    currentItems,
    isLoading,
    searchTerm,
    statusFilter,
    currentPage,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    handleSearch,
    handleStatusFilter,
    handleRefresh,
    handleExport,
    handlePageChange,
    handleNextPage,
    handlePrevPage,
    formatDate,
    calculateTotals,
  };
};
