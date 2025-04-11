
import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, RefreshCw, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import refactored components
import ClassFilters from "./class-logs/ClassFilters";
import ClassTable from "./class-logs/ClassTable";
import ClassDetailsDialog from "./class-logs/ClassDetailsDialog";
import useClassLogs from "@/hooks/useClassLogs";

const ClassLogs: React.FC = () => {
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    subjectFilter,
    setSubjectFilter,
    dateFilter,
    setDateFilter,
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClass,
    studentUploads,
    studentMessages,
    activeDetailsTab,
    setActiveDetailsTab,
    isExporting,
    isLoading,
    classes,
    filteredClasses,
    allSubjects,
    handleClassClick,
    formatTime,
    clearFilters,
    handleMarkMessageRead,
    getUnreadMessageCount,
    handleDownloadFile,
    handleExport,
    handleRefreshData
  } = useClassLogs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Class Logs</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={isLoading}>
                <FileDown className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Printer className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <ClassFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        subjectFilter={subjectFilter}
        setSubjectFilter={setSubjectFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        clearFilters={clearFilters}
        allSubjects={allSubjects}
      />
      
      <ClassTable
        classes={classes}
        filteredClasses={filteredClasses}
        isLoading={isLoading}
        handleClassClick={handleClassClick}
        clearFilters={clearFilters}
        getUnreadMessageCount={getUnreadMessageCount}
        formatTime={formatTime}
      />
      
      <ClassDetailsDialog
        isDetailsOpen={isDetailsOpen}
        setIsDetailsOpen={setIsDetailsOpen}
        selectedClass={selectedClass}
        activeDetailsTab={activeDetailsTab}
        setActiveDetailsTab={setActiveDetailsTab}
        studentUploads={studentUploads}
        studentMessages={studentMessages}
        handleDownloadFile={handleDownloadFile}
        handleMarkMessageRead={handleMarkMessageRead}
        getUnreadMessageCount={getUnreadMessageCount}
        formatTime={formatTime}
      />
    </div>
  );
};

export default ClassLogs;
