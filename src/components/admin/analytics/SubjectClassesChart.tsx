import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface SubjectClass {
  name: string;
  count: number;
  color: string;
}

interface SubjectClassesChartProps {
  data: SubjectClass[];
}

const SubjectClassesChart: React.FC<SubjectClassesChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Classes by Subject</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer
          config={{
            math: { color: '#4F46E5' },
            science: { color: '#10B981' },
            english: { color: '#F59E0B' },
            history: { color: '#EF4444' },
            languages: { color: '#3B82F6' },
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip />
              <Bar dataKey="count" fill="var(--color-math)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default SubjectClassesChart;
