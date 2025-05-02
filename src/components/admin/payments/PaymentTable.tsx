
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import PaginationControls from '@/components/common/Pagination';

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

interface PaymentTableProps {
  payments: Payment[];
  currentPage: number;
  totalPages: number;
  indexOfFirstItem: number;
  indexOfLastItem: number;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  isLoading: boolean;
  formatDate: (dateStr: string) => string;
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  currentPage,
  totalPages,
  indexOfFirstItem,
  indexOfLastItem,
  onPageChange,
  onNextPage,
  onPrevPage,
  isLoading,
  formatDate,
}) => {
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();

    if (statusLower === 'paid') {
      return <Badge variant="default">Paid</Badge>;
    } else if (statusLower === 'pending') {
      return <Badge variant="outline">Pending</Badge>;
    } else if (statusLower.includes('overdue') || statusLower === 'late') {
      return <Badge variant="destructive">Overdue</Badge>;
    } else {
      return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p>Loading payment data...</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No payment records found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Tutor</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Student Payment</TableHead>
              <TableHead>Tutor Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.id}</TableCell>
                <TableCell>{formatDate(payment.date)}</TableCell>
                <TableCell>{payment.tutorName}</TableCell>
                <TableCell>{payment.studentName}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div>${payment.classCost.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      Tutor: ${payment.tutorCost.toFixed(2)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(payment.studentPaymentStatus)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(payment.tutorPaymentStatus)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <PaginationControls 
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={currentPage < totalPages}
        hasPrevPage={currentPage > 1}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        onPageChange={onPageChange}
        className="mt-4"
      />
      
      <div className="text-sm text-muted-foreground text-center mt-2">
        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, payments.length)} of {payments.length} entries
      </div>
    </>
  );
};

export default PaymentTable;
