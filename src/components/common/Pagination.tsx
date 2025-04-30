
import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
  className?: string;
  showPageNumbers?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onNextPage,
  onPrevPage,
  onPageChange,
  className = '',
  showPageNumbers = true,
}) => {
  // Generate page numbers to display (current page, 2 before and 2 after if available)
  const getVisiblePages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [1];
    
    if (currentPage > 3) {
      pages.push(-1); // Ellipsis
    }

    // Pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push(-2); // Ellipsis
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={`flex flex-col items-center space-y-2 py-4 ${className}`}>
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages || 1}
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault();
                if (hasPrevPage) onPrevPage();
              }}
              className={!hasPrevPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {showPageNumbers && totalPages > 1 && getVisiblePages().map((page, idx) => (
            <React.Fragment key={idx}>
              {page < 0 ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem>
                  <PaginationLink
                    isActive={page === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(page);
                    }}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )}
            </React.Fragment>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={(e) => {
                e.preventDefault();
                if (hasNextPage) onNextPage();
              }}
              className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default PaginationControls;
