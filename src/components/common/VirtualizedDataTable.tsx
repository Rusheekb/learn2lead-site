import React, { useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
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

// Stagger animation variants for table rows
const tableRowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }),
};

export interface ColumnDefinition<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  width?: number;
}

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export interface VirtualizedDataTableProps<T> {
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
  rowHeight?: number;
  maxHeight?: number;
  virtualizationThreshold?: number;
}

const TablePagination = memo(function TablePagination({
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
});

interface VirtualizedTableBodyProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  onRowClick?: (item: T) => void;
  rowHeight: number;
  maxHeight: number;
}

function VirtualizedTableBody<T>({
  data,
  columns,
  onRowClick,
  rowHeight,
  maxHeight,
}: VirtualizedTableBodyProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const row = data[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={`absolute top-0 left-0 w-full flex items-center border-b border-border ${
                onRowClick ? 'cursor-pointer hover:bg-muted/60' : ''
              }`}
              style={{
                height: `${rowHeight}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column, colIndex) => (
                <div
                  key={colIndex}
                  className={`px-4 py-2 flex-1 ${column.className || ''}`}
                  style={column.width ? { width: column.width, flex: 'none' } : undefined}
                >
                  {column.cell
                    ? column.cell(row)
                    : column.accessorKey
                    ? String(row[column.accessorKey] || '')
                    : ''}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VirtualizedDataTable<T>({
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
  cardClassName = '',
  showCard = true,
  rowHeight = 52,
  maxHeight = 500,
  virtualizationThreshold = 50,
}: VirtualizedDataTableProps<T>) {
  const shouldVirtualize = data.length > virtualizationThreshold;

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
        <div className="text-center py-12 text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    if (data.length === 0) {
      return emptyState || (
        <div className="text-center py-12 text-muted-foreground">
          <p>No data found.</p>
        </div>
      );
    }

    // Use virtualization for large datasets
    if (shouldVirtualize) {
      return (
        <>
          <div className="overflow-x-auto">
            {/* Header */}
            <div className="flex border-b border-border bg-muted/50">
              {columns.map((column, index) => (
                <div
                  key={index}
                  className={`px-4 py-3 text-sm font-medium text-muted-foreground flex-1 ${column.className || ''}`}
                  style={column.width ? { width: column.width, flex: 'none' } : undefined}
                >
                  {column.header}
                </div>
              ))}
            </div>
            
            {/* Virtualized Body */}
            <VirtualizedTableBody
              data={data}
              columns={columns}
              onRowClick={onRowClick}
              rowHeight={rowHeight}
              maxHeight={maxHeight}
            />
          </div>

          {pagination && <TablePagination {...pagination} />}
        </>
      );
    }

    // Standard table for small datasets
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
                  className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${onRowClick ? 'cursor-pointer hover:bg-muted/60' : ''}`}
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

        {pagination && <TablePagination {...pagination} />}
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

export default memo(VirtualizedDataTable) as typeof VirtualizedDataTable;
