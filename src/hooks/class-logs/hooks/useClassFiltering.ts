
import { useState } from 'react';
import { ClassEvent, PaymentStatus } from '@/types/tutorTypes';

export const useClassFiltering = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [showCodeLogs, setShowCodeLogs] = useState<boolean>(true);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    'all' | 'paid' | 'unpaid'
  >('all');
  const [tutorPaymentStatusFilter, setTutorPaymentStatusFilter] = useState<
    'all' | 'paid' | 'unpaid'
  >('all');
  const [costRangeFilter, setCostRangeFilter] = useState<{
    min: number;
    max: number | null;
  }>({ min: 0, max: null });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSubjectFilter('all');
    setDateFilter(undefined);
    setPaymentStatusFilter('all');
    setTutorPaymentStatusFilter('all');
    setCostRangeFilter({ min: 0, max: null });
  };

  const applyFilters = (classes: ClassEvent[]) => {
    return classes.filter((cls) => {
      if (!showCodeLogs && cls?.isCodeLog) return false;

      const searchMatch =
        searchTerm === '' ||
        (cls?.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (cls?.tutorName?.toLowerCase() || '').includes(
          searchTerm.toLowerCase()
        ) ||
        (cls?.studentName?.toLowerCase() || '').includes(
          searchTerm.toLowerCase()
        );

      const statusMatch =
        statusFilter === 'all' || cls?.status === statusFilter;

      const subjectMatch =
        subjectFilter === 'all' ||
        (cls?.subject?.toLowerCase() || '') === subjectFilter.toLowerCase();

      const dateMatch =
        !dateFilter ||
        new Date(cls?.date).toDateString() === dateFilter.toDateString();

      // Convert the payment status values to lowercase for case-insensitive comparison
      const studentPaymentLower = cls?.studentPayment?.toLowerCase() as PaymentStatus | undefined;
      const tutorPaymentLower = cls?.tutorPayment?.toLowerCase() as PaymentStatus | undefined;

      const paymentMatch =
        paymentStatusFilter === 'all' ||
        (paymentStatusFilter === 'paid'
          ? studentPaymentLower === 'paid'
          : studentPaymentLower === 'unpaid');

      const tutorPaymentMatch =
        tutorPaymentStatusFilter === 'all' ||
        (tutorPaymentStatusFilter === 'paid'
          ? tutorPaymentLower === 'paid'
          : tutorPaymentLower === 'unpaid');

      const classCost = cls?.classCost || 0;
      const costMatch =
        (!costRangeFilter.min || classCost >= costRangeFilter.min) &&
        (!costRangeFilter.max || classCost <= costRangeFilter.max);

      return (
        searchMatch &&
        statusMatch &&
        subjectMatch &&
        dateMatch &&
        paymentMatch &&
        tutorPaymentMatch &&
        costMatch
      );
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    subjectFilter,
    setSubjectFilter,
    dateFilter,
    setDateFilter,
    showCodeLogs,
    setShowCodeLogs,
    paymentStatusFilter,
    setPaymentStatusFilter,
    tutorPaymentStatusFilter,
    setTutorPaymentStatusFilter,
    costRangeFilter,
    setCostRangeFilter,
    clearFilters,
    applyFilters,
  };
};
