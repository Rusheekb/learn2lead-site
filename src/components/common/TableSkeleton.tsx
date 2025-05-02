
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface TableSkeletonProps {
  columns: string[];
  rowCount?: number;
  cellWidths?: string[];
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  columns, 
  rowCount = 5,
  cellWidths = []
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={index}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array(rowCount).fill(0).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {columns.map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton 
                  className={`h-5 ${cellWidths[colIndex] || 'w-24'}`} 
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TableSkeleton;
