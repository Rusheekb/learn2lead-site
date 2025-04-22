import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';

interface StudentProgress {
  name: string;
  avgScore: number;
}

interface StudentProgressChartProps {
  data: StudentProgress[];
}

const StudentProgressChart: React.FC<StudentProgressChartProps> = ({
  data,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Average Student Progress</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer
          config={{
            avgScore: { color: '#10B981' },
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[60, 100]} />
              <ChartTooltip />
              <Line
                type="monotone"
                dataKey="avgScore"
                name="Average Score"
                stroke="var(--color-avgScore)"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default StudentProgressChart;
