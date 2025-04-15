
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

interface MonthlyDistributionTableProps {
  monthlyClasses: Record<string, number>;
}

const MonthlyDistributionTable: React.FC<MonthlyDistributionTableProps> = ({ 
  monthlyClasses 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Class Distribution</CardTitle>
        <CardDescription>Classes per month</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Classes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(monthlyClasses)
              .sort((a, b) => {
                // Sort by date (most recent first)
                const dateA = new Date(a[0]);
                const dateB = new Date(b[0]);
                return dateB.getTime() - dateA.getTime();
              })
              .map(([month, count]) => (
                <TableRow key={month}>
                  <TableCell>{month}</TableCell>
                  <TableCell className="text-right">{count.toString()}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MonthlyDistributionTable;
