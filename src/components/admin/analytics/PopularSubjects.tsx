import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Beaker, BookOpen, Book, Globe } from 'lucide-react';

const PopularSubjects: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Popular Subjects</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calculator className="h-5 w-5 text-tutoring-blue mr-2" />
              <span>Mathematics</span>
            </div>
            <span className="font-medium">28%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Beaker className="h-5 w-5 text-green-600 mr-2" />
              <span>Science</span>
            </div>
            <span className="font-medium">24%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 text-amber-500 mr-2" />
              <span>English</span>
            </div>
            <span className="font-medium">18%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Book className="h-5 w-5 text-red-600 mr-2" />
              <span>History</span>
            </div>
            <span className="font-medium">16%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="h-5 w-5 text-blue-500 mr-2" />
              <span>Languages</span>
            </div>
            <span className="font-medium">14%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PopularSubjects;
