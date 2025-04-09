
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { formatTime } from "@/utils/dateTimeUtils";

interface ClassItem {
  id: number;
  title: string;
  subject: string;
  tutorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  attendance: string;
  zoomLink: string;
  notes: string;
  studentName: string;
}

interface UpcomingClassesTableProps {
  classes: ClassItem[];
  onViewClass: (cls: ClassItem) => void;
}

const UpcomingClassesTable: React.FC<UpcomingClassesTableProps> = ({ classes, onViewClass }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Class</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Tutor</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {classes.map((cls) => (
          <TableRow key={cls.id}>
            <TableCell>
              <div>
                <p className="font-medium">{cls.title}</p>
                <p className="text-sm text-gray-500">{cls.subject}</p>
              </div>
            </TableCell>
            <TableCell>{cls.date}</TableCell>
            <TableCell>{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</TableCell>
            <TableCell>{cls.tutorName}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onViewClass(cls)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  onClick={() => onViewClass(cls)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default UpcomingClassesTable;
