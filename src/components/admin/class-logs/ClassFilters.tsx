
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface ClassFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  subjectFilter: string;
  setSubjectFilter: (subject: string) => void;
  dateFilter: Date | undefined;
  setDateFilter: (date: Date | undefined) => void;
  clearFilters: () => void;
  allSubjects: string[];
  showCodeLogs: boolean;
  setShowCodeLogs: (show: boolean) => void;
}

const ClassFilters: React.FC<ClassFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  subjectFilter,
  setSubjectFilter,
  dateFilter,
  setDateFilter,
  clearFilters,
  allSubjects,
  showCodeLogs,
  setShowCodeLogs
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="flex items-center gap-2 col-span-4 md:col-span-2">
        <Input
          placeholder="Search by title, tutor, or student"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
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
      
      <div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {allSubjects.map((subject) => (
              <SelectItem key={subject} value={subject.toLowerCase()}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
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
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-center justify-between col-span-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="code-logs" 
            checked={showCodeLogs} 
            onCheckedChange={setShowCodeLogs} 
          />
          <Label htmlFor="code-logs">Show code logs</Label>
        </div>
        
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default ClassFilters;
