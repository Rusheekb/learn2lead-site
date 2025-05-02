
import React from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { formatTime } from '@/utils/dateTimeUtils';

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

const UpcomingClassesTable: React.FC<UpcomingClassesTableProps> = ({
  classes,
  onViewClass,
}) => {
  const columns: ColumnDefinition<ClassItem>[] = [
    {
      header: 'Class',
      cell: (cls) => (
        <div>
          <p className="font-medium dark:text-gray-100">{cls.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{cls.subject}</p>
        </div>
      ),
    },
    {
      header: 'Date',
      accessorKey: 'date',
    },
    {
      header: 'Time',
      cell: (cls) => (
        `${formatTime(cls.startTime)} - ${formatTime(cls.endTime)}`
      ),
    },
    {
      header: 'Tutor',
      accessorKey: 'tutorName',
    },
    {
      header: 'Actions',
      cell: (cls) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={() => onViewClass(cls)}
          >
            View Details
          </Button>
          <Button 
            size="sm"
            className="dark:bg-tutoring-teal dark:text-gray-900"
            onClick={() => onViewClass(cls)}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={classes}
      columns={columns}
      showCard={false}
    />
  );
};

export default UpcomingClassesTable;
