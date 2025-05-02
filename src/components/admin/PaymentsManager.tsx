
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { fetchPaymentsData } from '@/services/dataService';
import { useClassLogs } from '@/hooks/useClassLogs';
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

const PaymentsManager: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { classes } = useClassLogs();
  
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

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Management</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleExport}
          >
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.classCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Tutor Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.tutorCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.profit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.pending.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
            <Select defaultValue="all" onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <p>Loading payment data...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No payment records found.</p>
            </div>
          ) : (
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
                    {currentItems.map((payment) => (
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
              
              {/* Pagination Controls */}
              <PaginationControls 
                currentPage={currentPage}
                totalPages={totalPages}
                hasNextPage={currentPage < totalPages}
                hasPrevPage={currentPage > 1}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                onPageChange={handlePageChange}
                className="mt-4"
              />
              
              <div className="text-sm text-muted-foreground text-center mt-2">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPayments.length)} of {filteredPayments.length} entries
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsManager;
