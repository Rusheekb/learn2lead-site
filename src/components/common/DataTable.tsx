
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton row animation variants
const skeletonRowVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.05,
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
    },
  }),
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

// Spring-based stagger animation variants for table rows with exit
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
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
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
  /** Unique key extractor for exit animations. Falls back to row index if not provided. */
  keyExtractor?: (item: T, index: number) => string | number;
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
    <nav aria-label="Table pagination" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
      <div className="text-sm text-muted-foreground" aria-live="polite">
        {totalItems > 0 && (
          <span>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="dt-page-size" className="text-sm font-medium whitespace-nowrap">Rows</label>
            <select
              id="dt-page-size"
              className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            Prev
          </Button>
          <div className="text-sm whitespace-nowrap" aria-current="page">
            {currentPage}/{totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      </div>
    </nav>
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
  keyExtractor,
}: DataTableProps<T>) {
  // Generate stable keys for AnimatePresence
  const getRowKey = (item: T, index: number): string | number => {
    if (keyExtractor) return keyExtractor(item, index);
    // Try to use common id fields as fallback
    const itemAny = item as Record<string, unknown>;
    if (itemAny.id) return String(itemAny.id);
    return index;
  };
  const renderContent = () => {
    if (isLoading) {
      return loadingState || (
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
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <motion.tr
                  key={rowIndex}
                  custom={rowIndex}
                  initial="hidden"
                  animate="visible"
                  variants={skeletonRowVariants}
                  className="border-b"
                >
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-4 w-full animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]" />
                    </TableCell>
                  ))}
                </motion.tr>
              ))}
            </TableBody>
          </Table>
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
              <AnimatePresence mode="popLayout">
                {data.map((row, rowIndex) => (
                  <motion.tr
                    key={getRowKey(row, rowIndex)}
                    custom={rowIndex}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tableRowVariants}
                    layout
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
              </AnimatePresence>
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
