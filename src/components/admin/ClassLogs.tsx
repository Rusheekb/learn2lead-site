import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FileDown, Printer, RefreshCw, Download, Upload, Loader } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Import refactored components
import ClassFilters from './class-logs/ClassFilters';
import ClassTable from './class-logs/ClassTable';
import ClassDetailsDialog from './class-logs/ClassDetailsDialog';
import CsvUploader from './class-logs/CsvUploader';
import { useClassLogs } from '@/hooks/useClassLogs';
import { ExportFormat } from '@/types/classTypes';

const ClassLogs: React.FC = () => {
  const { t } = useTranslation();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const {
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
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab,
    setActiveDetailsTab,
    
    isLoading,
    error,
    classes,
    filteredClasses,
    paginatedClasses,
    allSubjects,
    page,
    pageSize,
    totalPages,
    totalItems,
    handleClassClick,
    formatTime,
    clearFilters,
    handleDownloadFile,
    
    handleRefreshData,
    handlePageChange,
    handlePageSizeChange,
  } = useClassLogs();


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('classLogs.title')}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {t('classLogs.importCSV')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            {isLoading ? t('classLogs.refreshing') : t('classLogs.refresh')}
          </Button>
        </div>
      </div>

      <ClassFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        subjectFilter={subjectFilter}
        setSubjectFilter={setSubjectFilter}
        dateFilter={dateFilter || undefined}
        setDateFilter={(date) => setDateFilter(date || null)}
        clearFilters={clearFilters}
        allSubjects={allSubjects}
        showCodeLogs={showCodeLogs}
        setShowCodeLogs={setShowCodeLogs}
      />

      <ClassTable
        classes={classes}
        filteredClasses={filteredClasses}
        paginatedClasses={paginatedClasses}
        isLoading={isLoading}
        error={error}
        handleClassClick={handleClassClick}
        clearFilters={handleRefreshData}
        formatTime={formatTime}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <ClassDetailsDialog
        isDetailsOpen={isDetailsOpen}
        setIsDetailsOpen={setIsDetailsOpen}
        selectedClass={selectedClass}
        activeDetailsTab={activeDetailsTab}
        setActiveDetailsTab={setActiveDetailsTab}
        studentUploads={studentUploads}
        studentMessages={studentMessages}
        handleDownloadFile={async () => {}}
        formatTime={formatTime}
      />

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Class Logs</DialogTitle>
          </DialogHeader>
          <CsvUploader
            onUploadComplete={() => {
              setIsUploadOpen(false);
              handleRefreshData();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassLogs;
