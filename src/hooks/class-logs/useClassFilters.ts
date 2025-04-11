
import { useState } from "react";

export const useClassFilters = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSubjectFilter("all");
    setDateFilter(undefined);
  };

  const applyFilters = (classes: any[]) => {
    return classes.filter((cls) => {
      const searchMatch = searchTerm === "" || 
        cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.studentName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = statusFilter === "all" || cls.status === statusFilter;
      
      const subjectMatch = subjectFilter === "all" || cls.subject.toLowerCase() === subjectFilter.toLowerCase();
      
      const dateMatch = !dateFilter || new Date(cls.date).toDateString() === dateFilter.toDateString();
      
      return searchMatch && statusMatch && subjectMatch && dateMatch;
    });
  };

  return {
    // Filter state
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    subjectFilter,
    setSubjectFilter,
    dateFilter,
    setDateFilter,
    
    // Actions
    clearFilters,
    applyFilters,
  };
};

export default useClassFilters;
