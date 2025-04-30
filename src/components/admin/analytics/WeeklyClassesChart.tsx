
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

interface WeeklyClass {
  name: string;
  classes: number;
}

interface WeeklyClassesChartProps {
  data: WeeklyClass[];
}

const WeeklyClassesChart: React.FC<WeeklyClassesChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Classes Trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer
          config={{
            classes: { color: '#3B82F6' },
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip />
              <Line
                type="monotone"
                dataKey="classes"
                stroke="var(--color-classes)"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default WeeklyClassesChart;
