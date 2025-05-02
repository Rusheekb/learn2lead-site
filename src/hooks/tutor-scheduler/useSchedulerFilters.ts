
import { useState } from 'react';

export const useSchedulerFilters = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [studentFilter, setStudentFilter] = useState<string>('all');

  const applyFilters = (classes: any[]) => {
    return classes.filter((cls) => {
      if (cls?.isCodeLog) return false;

      const matchesSearch =
        searchTerm === '' ||
        (cls?.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (cls?.studentName?.toLowerCase() || '').includes(
          searchTerm.toLowerCase()
        );

      const matchesSubject =
        subjectFilter === 'all' || cls?.subject === subjectFilter;

      const matchesStudent =
        studentFilter === 'all' || cls?.studentId?.toString() === studentFilter;

      return matchesSearch && matchesSubject && matchesStudent;
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    subjectFilter,
    setSubjectFilter,
    studentFilter,
    setStudentFilter,
    applyFilters,
  };
};

export default useSchedulerFilters;
