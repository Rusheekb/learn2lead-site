import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "@/types/tutorTypes";

interface SchedulerFilterProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  subjectFilter: string;
  setSubjectFilter: (value: string) => void;
  studentFilter: string;
  setStudentFilter: (value: string) => void;
  allSubjects: string[];
  students: Student[];
}

const SchedulerFilter: React.FC<SchedulerFilterProps> = ({
  searchTerm,
  setSearchTerm,
  subjectFilter,
  setSubjectFilter,
  studentFilter,
  setStudentFilter,
  allSubjects,
  students,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search classes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={subjectFilter} onValueChange={setSubjectFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by subject" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem key="all-subjects" value="all">All Subjects</SelectItem>
          {allSubjects.map(subject => (
            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={studentFilter} onValueChange={setStudentFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by student" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem key="all-students" value="all">All Students</SelectItem>
          {students.map(student => (
            <SelectItem key={student.id} value={student.id.toString()}>{student.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SchedulerFilter;
