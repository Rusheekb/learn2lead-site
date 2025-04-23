
import { useState } from 'react';

export const usePaginationHandling = () => {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    handlePageChange,
    handlePageSizeChange,
  };
};
