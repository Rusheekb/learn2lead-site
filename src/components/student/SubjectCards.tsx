import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Subject } from '@/constants/subjectsData';
import { TopicResourceLinks } from './resources';

interface SubjectCardsProps {
  subjects: Subject[];
  selectedSubject: number | null;
  onSubjectClick: (subjectId: number) => void;
}

const SubjectCards: React.FC<SubjectCardsProps> = memo(({
  subjects,
  selectedSubject,
  onSubjectClick,
}) => {
  const navigate = useNavigate();

  const handleExploreResources = (e: React.MouseEvent, subjectId: number) => {
    e.stopPropagation();
    navigate(`/dashboard/subject/${subjectId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject) => {
        const IconComponent = subject.iconComponent;

        return (
          <Card
            key={subject.id}
            interactive
            className={`bg-card ${
              selectedSubject === subject.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSubjectClick(subject.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{subject.name}</CardTitle>
              <IconComponent className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {subject.description}
              </p>

              {selectedSubject === subject.id && (
                <div className="mt-4 space-y-4">
                  <h4 className="font-medium text-sm">Topics:</h4>
                  <div className="space-y-3">
                    {subject.topics.slice(0, 3).map((topic, index) => (
                      <div key={index} className="space-y-2">
                        <p className="text-sm font-medium text-foreground">{topic.name}</p>
                        <TopicResourceLinks resources={topic.resources} compact />
                      </div>
                    ))}
                    {subject.topics.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{subject.topics.length - 3} more topics
                      </p>
                    )}
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    size="sm"
                    onClick={(e) => handleExploreResources(e, subject.id)}
                  >
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
});

SubjectCards.displayName = 'SubjectCards';

export default SubjectCards;
