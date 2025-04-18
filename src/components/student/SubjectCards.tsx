
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Subject } from '@/constants/subjectsData';

interface SubjectCardsProps {
  subjects: Subject[];
  selectedSubject: number | null;
  onSubjectClick: (subjectId: number) => void;
}

const SubjectCards: React.FC<SubjectCardsProps> = ({
  subjects,
  selectedSubject,
  onSubjectClick,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject) => {
        const IconComponent = subject.iconComponent;
        
        return (
          <Card 
            key={subject.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedSubject === subject.id ? 'ring-2 ring-tutoring-blue' : ''
            }`}
            onClick={() => onSubjectClick(subject.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{subject.name}</CardTitle>
              <IconComponent className="h-8 w-8 text-tutoring-blue" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{subject.description}</p>
              
              {selectedSubject === subject.id && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm">Topics:</h4>
                  <ul className="pl-5 space-y-1">
                    {subject.topics.map((topic, index) => (
                      <li key={index} className="text-sm">
                        <a href="#" className="text-tutoring-blue hover:text-tutoring-teal hover:underline">
                          {topic}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-4" size="sm">
                    Explore All {subject.name} Resources
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SubjectCards;
