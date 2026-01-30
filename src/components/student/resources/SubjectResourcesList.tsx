import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { subjects } from '@/constants/subjectsData';
import TopicResourceLinks from './TopicResourceLinks';

const SubjectResourcesList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const navigate = useNavigate();

  const filteredSubjects = subjects.map(subject => ({
    ...subject,
    topics: subject.topics.filter(topic =>
      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.resources.some(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.source.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ),
  })).filter(subject => subject.topics.length > 0 || subject.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSubjectClick = (subjectId: number) => {
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId);
  };

  const handleViewAll = (subjectId: number) => {
    navigate(`/dashboard/subject/${subjectId}`);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search subjects, topics, or resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Subject Cards */}
      <div className="grid gap-4">
        {filteredSubjects.map((subject) => {
          const IconComponent = subject.iconComponent;
          const isExpanded = expandedSubject === subject.id;

          return (
            <Card key={subject.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleSubjectClick(subject.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {subject.topics.length} topics • {subject.topics.reduce((acc, t) => acc + t.resources.length, 0)} resources
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {subject.topics.slice(0, 3).map((topic, idx) => (
                      <div key={idx} className="space-y-2">
                        <h4 className="font-medium text-sm text-foreground">{topic.name}</h4>
                        <TopicResourceLinks resources={topic.resources} compact />
                      </div>
                    ))}
                    
                    {subject.topics.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        +{subject.topics.length - 3} more topics
                      </p>
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewAll(subject.id);
                      }}
                    >
                      View All {subject.name} Resources
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No resources found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default SubjectResourcesList;
