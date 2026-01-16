
import React from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Spring-based stagger animation variants for table rows
const tableRowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.025,
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  }),
};

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export interface ColumnDefinition<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
  onRowClick?: (item: T) => void;
  pagination?: TablePaginationProps;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  loadingState?: React.ReactNode;
  cardClassName?: string;
  showCard?: boolean;
}

function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: TablePaginationProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        {totalItems > 0 && (
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
          </span>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        {onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function DataTable<T>({
  data,
  columns,
  isLoading = false,
  error = null,
  title,
  subtitle,
  onRowClick,
  pagination,
  emptyState,
  errorState,
  loadingState,
  cardClassName = "",
  showCard = true,
}: DataTableProps<T>) {
  const renderContent = () => {
    if (isLoading) {
      return loadingState || (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Loading data...</p>
        </div>
      );
    }

    if (error) {
      return errorState || (
        <div className="text-center py-12 text-red-500">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    if (data.length === 0) {
      return emptyState || (
        <div className="text-center py-12 text-gray-500">
          <p>No data found.</p>
        </div>
      );
    }

    return (
      <>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={index} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <motion.tr
                  key={rowIndex}
                  custom={rowIndex}
                  initial="hidden"
                  animate="visible"
                  variants={tableRowVariants}
                  whileHover={{ 
                    backgroundColor: 'hsl(var(--muted) / 0.6)',
                    scale: 1.005,
                    transition: { type: 'spring' as const, stiffness: 500, damping: 30 }
                  }}
                  className={`border-b transition-colors data-[state=selected]:bg-muted ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex} className={column.className}>
                      {column.cell
                        ? column.cell(row)
                        : column.accessorKey
                        ? String(row[column.accessorKey] || '')
                        : ''}
                    </TableCell>
                  ))}
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        {pagination && (
          <TablePagination {...pagination} />
        )}
      </>
    );
  };

  if (!showCard) {
    return renderContent();
  }

  return (
    <Card className={cardClassName}>
      {(title || subtitle) && (
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {title && <CardTitle>{title}</CardTitle>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-2 sm:p-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

export default DataTable;
