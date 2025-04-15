
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PopularSubject } from '@/types/sharedTypes';

interface PopularSubjectsTableProps {
  popularSubjects: PopularSubject[];
}

const PopularSubjectsTable: React.FC<PopularSubjectsTableProps> = ({ 
  popularSubjects 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Subjects</CardTitle>
        <CardDescription>Most requested topics</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Classes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {popularSubjects.map(({ subject, count }) => (
              <TableRow key={subject}>
                <TableCell>{subject}</TableCell>
                <TableCell className="text-right">{count.toString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PopularSubjectsTable;
