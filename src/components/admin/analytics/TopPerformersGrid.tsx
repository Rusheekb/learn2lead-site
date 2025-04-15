
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

interface TopPerformer {
  name: string;
  value: number;
}

interface TopPerformersGridProps {
  topTutors: TopPerformer[];
  topStudents: TopPerformer[];
}

const TopPerformersGrid: React.FC<TopPerformersGridProps> = ({ 
  topTutors, 
  topStudents 
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top Tutors</CardTitle>
          <CardDescription>By number of classes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tutor</TableHead>
                <TableHead className="text-right">Classes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topTutors.map(({ name, value }) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell className="text-right">{value.toString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Students</CardTitle>
          <CardDescription>By number of classes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Classes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStudents.map(({ name, value }) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell className="text-right">{value.toString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TopPerformersGrid;
