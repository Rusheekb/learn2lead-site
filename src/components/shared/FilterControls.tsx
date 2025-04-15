
import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FilterOption {
  value: string;
  label: string;
}

export interface CommonFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchPlaceholder?: string;
  showDateFilter?: boolean;
  dateFilter?: Date;
  setDateFilter?: (date: Date | undefined) => void;
  showSubjectFilter?: boolean;
  subjectFilter?: string;
  setSubjectFilter?: (subject: string) => void;
  subjectOptions?: FilterOption[] | string[];
  showStatusFilter?: boolean;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
  statusOptions?: FilterOption[];
  showStudentFilter?: boolean;
  studentFilter?: string;
  setStudentFilter?: (student: string) => void;
  studentOptions?: FilterOption[];
  showCodeLogsSwitch?: boolean;
  showCodeLogs?: boolean;
  setShowCodeLogs?: (show: boolean) => void;
  clearFilters: () => void;
}

const FilterControls: React.FC<CommonFilterProps> = ({
  searchTerm,
  setSearchTerm,
  searchPlaceholder = "Search...",
  showDateFilter = false,
  dateFilter,
  setDateFilter,
  showSubjectFilter = false,
  subjectFilter = "all",
  setSubjectFilter,
  subjectOptions = [],
  showStatusFilter = false,
  statusFilter = "all",
  setStatusFilter,
  statusOptions = [],
  showStudentFilter = false,
  studentFilter = "all",
  setStudentFilter,
  studentOptions = [],
  showCodeLogsSwitch = false,
  showCodeLogs = false,
  setShowCodeLogs,
  clearFilters
}) => {
  // Transform string arrays to option objects if needed
  const normalizedSubjectOptions = subjectOptions.map(opt => 
    typeof opt === 'string' ? { value: opt.toLowerCase() || `subject-${opt.toLowerCase()}`, label: opt } : opt
  );
  
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Search Box */}
      <div className={`flex items-center gap-2 ${showDateFilter || showStatusFilter || showSubjectFilter ? "col-span-4 md:col-span-2" : "col-span-4"}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchTerm("")}
            className="h-10 w-10"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Status Filter */}
      {showStatusFilter && setStatusFilter && (
        <div>
          <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Subject Filter */}
      {showSubjectFilter && setSubjectFilter && (
        <div>
          <Select value={subjectFilter || "all"} onValueChange={setSubjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {normalizedSubjectOptions.map((subject) => (
                <SelectItem 
                  key={typeof subject === 'string' ? subject : subject.value} 
                  value={typeof subject === 'string' ? subject : subject.value}
                >
                  {typeof subject === 'string' ? subject : subject.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Student Filter */}
      {showStudentFilter && setStudentFilter && (
        <div>
          <Select value={studentFilter || "all"} onValueChange={setStudentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {studentOptions.map((student) => (
                <SelectItem 
                  key={typeof student === 'string' ? student : student.value} 
                  value={typeof student === 'string' ? student : student.value}
                >
                  {typeof student === 'string' ? student : student.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Date Filter */}
      {showDateFilter && dateFilter !== undefined && setDateFilter && (
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left",
                  !dateFilter && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, "PPP") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      
      {/* Code Logs Switch and Clear Filters */}
      <div className="flex items-center justify-between col-span-4">
        {showCodeLogsSwitch && setShowCodeLogs && (
          <div className="flex items-center space-x-2">
            <Switch 
              id="code-logs" 
              checked={showCodeLogs} 
              onCheckedChange={setShowCodeLogs} 
            />
            <Label htmlFor="code-logs">Show code logs</Label>
          </div>
        )}
        
        <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
          Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default FilterControls;
